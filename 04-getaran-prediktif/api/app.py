"""API GraphQL proyek 04 · Perawatan Prediktif Getaran (FastAPI + Strawberry + DuckDB).

GET  /            dasbor statis (web/)
POST /graphql     GraphQL; GET /graphql membuka GraphiQL bila GRAPHIQL=1
GET  /kesehatan   status layanan dan umur data
"""
import enum
import os
import threading
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import duckdb
import strawberry
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from strawberry.extensions import MaxAliasesLimiter, QueryDepthLimiter
from strawberry.fastapi import GraphQLRouter

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("DATA_DIR", "/data"))
MESIN_CSV = Path(os.environ.get("MESIN_CSV", ROOT / "db" / "mesin.csv"))
WEB_DIR = Path(os.environ.get("WEB_DIR", ROOT / "web"))
SHARED_DIR = Path(os.environ.get("SHARED_DIR", ROOT.parent / "shared"))
OFFLINE_MENIT = int(os.environ.get("OFFLINE_MENIT", "30"))

# Batas zona kecepatan getaran RMS (mm/s) menurut ISO 10816-1: (A/B, B/C, C/D)
BATAS_ISO = {"I": (0.71, 1.8, 4.5), "II": (1.12, 2.8, 7.1), "III": (1.8, 4.5, 11.2), "IV": (2.8, 7.1, 18.0)}

_con = duckdb.connect()
_kunci = threading.Lock()
_siap = False


def kueri(sql, params=()):
    """Jalankan SQL dan kembalikan list dict. View dibuat malas karena file Parquet ditulis simulator."""
    global _siap
    with _kunci:
        if not _siap:
            model = (ROOT / "db" / "model.sql").read_text(encoding="utf-8")
            try:
                _con.execute(model.replace("{DATA}", DATA.as_posix()).replace("{MESIN_CSV}", MESIN_CSV.as_posix()))
            except duckdb.Error as e:
                raise ValueError("Data getaran belum tersedia; simulator atau pengumpul data belum menulis file.") from e
            _siap = True
    cur = _con.cursor()
    cur.execute(sql, params)
    kolom = [d[0] for d in cur.description]
    return [dict(zip(kolom, r)) for r in cur.fetchall()]


def zona(rms, kelas):
    ab, bc, cd = BATAS_ISO[kelas]
    return "A" if rms <= ab else "B" if rms <= bc else "C" if rms <= cd else "D"


def utc(dt):
    return dt.replace(tzinfo=timezone.utc) if dt else None


@strawberry.enum(description="Status kondisi mesin hasil evaluasi zona dan umur data")
class Status(enum.Enum):
    NORMAL = "NORMAL"
    PERINGATAN = "PERINGATAN"
    KRITIS = "KRITIS"
    OFFLINE = "OFFLINE"


@strawberry.enum
class Prioritas(enum.Enum):
    RENDAH = "RENDAH"
    SEDANG = "SEDANG"
    TINGGI = "TINGGI"


@strawberry.type(description="Batas zona ISO 10816-1 untuk kelas mesin ini, mm/s RMS")
class BatasZona:
    ab: float
    bc: float
    cd: float


@strawberry.type
class TitikTren:
    tanggal: date
    rms_mm_s: float
    suhu_maks_c: float


@strawberry.type(description="Spektrum FFT kecepatan getaran; amplitudo[i] berada pada frekuensi i × resolusiHz")
class Spektrum:
    diukur_pada: datetime
    resolusi_hz: float
    frekuensi_putar_hz: float
    bpfo_hz: float
    amplitudo_mm_s: list[float]


@strawberry.type
class PerintahKerja:
    id: strawberry.ID
    mesin_id: str
    judul: str
    prioritas: Prioritas
    status: str
    dibuat_pada: datetime


def ke_perintah(r):
    return PerintahKerja(id=r["id"], mesin_id=r["mesin_id"], judul=r["judul"], prioritas=Prioritas(r["prioritas"]),
                         status=r["status"], dibuat_pada=utc(r["dibuat_pada"]))


@strawberry.type
class Mesin:
    id: strawberry.ID
    nama: str
    area: str
    kelas_iso: str
    daya_kw: float
    rpm: float
    bantalan: str
    jam_operasi: int
    rms_terkini_mm_s: Optional[float]
    suhu_bantalan_c: Optional[float]
    diukur_pada: Optional[datetime]
    zona: Optional[str]
    status: Status
    perubahan_30_hari_mm_s: Optional[float]
    batas_zona: BatasZona
    faktor_bpfo: strawberry.Private[float]

    @strawberry.field(description="RMS rata-rata harian, terlama dulu")
    def tren(self, hari: int = 30) -> list[TitikTren]:
        if not 1 <= hari <= 90:
            raise ValueError("Argumen hari harus 1 sampai 90.")
        rows = kueri("SELECT tanggal, rms_mm_s, suhu_maks_c FROM rms_harian WHERE mesin_id = ? "
                     "ORDER BY tanggal DESC LIMIT ?", (self.id, hari))
        return [TitikTren(tanggal=r["tanggal"], rms_mm_s=round(r["rms_mm_s"], 2), suhu_maks_c=r["suhu_maks_c"]) for r in reversed(rows)]

    @strawberry.field(description="Spektrum terakhir")
    def spektrum(self) -> Optional[Spektrum]:
        rows = kueri("SELECT s.diukur_pada, s.resolusi_hz, s.amplitudo, m.rpm FROM spektrum s JOIN mesin m ON m.id = s.mesin_id "
                     "WHERE s.mesin_id = ? ORDER BY s.diukur_pada DESC LIMIT 1", (self.id,))
        if not rows:
            return None
        r = rows[0]
        f1 = r["rpm"] / 60
        return Spektrum(diukur_pada=utc(r["diukur_pada"]), resolusi_hz=r["resolusi_hz"], frekuensi_putar_hz=round(f1, 2),
                        bpfo_hz=round(f1 * self.faktor_bpfo, 1), amplitudo_mm_s=[round(a, 3) for a in r["amplitudo"]])

    @strawberry.field
    def perintah_kerja(self) -> list[PerintahKerja]:
        return [ke_perintah(r) for r in kueri(
            "SELECT * FROM perintah_kerja WHERE mesin_id = ? ORDER BY dibuat_pada DESC", (self.id,))]


SQL_MESIN = """
SELECT m.*, r.rms_mm_s, r.suhu_c, r.diukur_pada,
       (SELECT arg_max(h.rms_mm_s, h.tanggal) - arg_min(h.rms_mm_s, h.tanggal) FROM rms_harian h
         WHERE h.mesin_id = m.id AND h.tanggal >= current_date - 29) AS perubahan
FROM mesin m LEFT JOIN rms_terakhir r ON r.mesin_id = m.id
"""


def ke_mesin(r, now):
    kelas = r["kelas_iso"]
    z = zona(r["rms_mm_s"], kelas) if r["rms_mm_s"] is not None else None
    basi = r["diukur_pada"] is None or now - utc(r["diukur_pada"]) > timedelta(minutes=OFFLINE_MENIT)
    status = Status.OFFLINE if basi else Status.KRITIS if z == "D" else Status.PERINGATAN if z == "C" else Status.NORMAL
    return Mesin(id=r["id"], nama=r["nama"], area=r["area"], kelas_iso=kelas, daya_kw=r["daya_kw"], rpm=r["rpm"],
                 bantalan=r["bantalan"], jam_operasi=int(r["jam_operasi_awal"]),
                 rms_terkini_mm_s=round(r["rms_mm_s"], 2) if r["rms_mm_s"] is not None else None,
                 suhu_bantalan_c=r["suhu_c"], diukur_pada=utc(r["diukur_pada"]), zona=z, status=status,
                 perubahan_30_hari_mm_s=round(r["perubahan"], 2) if r["perubahan"] is not None else None,
                 batas_zona=BatasZona(**dict(zip(("ab", "bc", "cd"), BATAS_ISO[kelas]))), faktor_bpfo=r["faktor_bpfo"])


URUT = {Status.KRITIS: 0, Status.PERINGATAN: 1, Status.OFFLINE: 2, Status.NORMAL: 3}


@strawberry.type
class Ringkasan:
    jumlah_mesin: int
    perlu_tindakan: int
    offline: int


def semua_mesin(area=None):
    now = datetime.now(timezone.utc)
    rows = kueri(SQL_MESIN + (" WHERE m.area = ?" if area else ""), (area,) if area else ())
    return sorted((ke_mesin(r, now) for r in rows), key=lambda m: (URUT[m.status], -(m.rms_terkini_mm_s or 0)))


@strawberry.type
class Query:
    @strawberry.field(description="Semua mesin, yang paling perlu tindakan di atas")
    def daftar_mesin(self, area: Optional[str] = None) -> list[Mesin]:
        return semua_mesin(area)

    @strawberry.field
    def mesin(self, id: strawberry.ID) -> Optional[Mesin]:
        rows = kueri(SQL_MESIN + " WHERE m.id = ?", (str(id),))
        return ke_mesin(rows[0], datetime.now(timezone.utc)) if rows else None

    @strawberry.field
    def ringkasan(self) -> Ringkasan:
        semua = semua_mesin()
        return Ringkasan(jumlah_mesin=len(semua),
                         perlu_tindakan=sum(m.status in (Status.KRITIS, Status.PERINGATAN) for m in semua),
                         offline=sum(m.status == Status.OFFLINE for m in semua))


@strawberry.input
class PerintahKerjaInput:
    mesin_id: strawberry.ID
    judul: str
    prioritas: Prioritas = Prioritas.SEDANG


@strawberry.type
class Mutation:
    @strawberry.mutation(description="Catat perintah kerja baru (status DIBUKA)")
    def buat_perintah_kerja(self, input: PerintahKerjaInput) -> PerintahKerja:
        judul = " ".join(input.judul.split())
        if not 3 <= len(judul) <= 120:
            raise ValueError("Judul perintah kerja harus 3 sampai 120 karakter.")
        if not kueri("SELECT 1 FROM mesin WHERE id = ?", (str(input.mesin_id),)):
            raise ValueError(f"Mesin {input.mesin_id} tidak terdaftar.")
        pk_id = "PK-" + uuid.uuid4().hex[:8].upper()
        now = datetime.now(timezone.utc).replace(microsecond=0)
        tujuan = DATA / "perintah_kerja" / f"{pk_id}.parquet"
        with _kunci:
            _con.execute(
                "COPY (SELECT ?::VARCHAR AS id, ?::VARCHAR AS mesin_id, ?::VARCHAR AS judul, ?::VARCHAR AS prioritas, "
                "'DIBUKA' AS status, ?::TIMESTAMP AS dibuat_pada) TO '" + tujuan.as_posix() + "' (FORMAT PARQUET)",
                (pk_id, str(input.mesin_id), judul, input.prioritas.value, now.replace(tzinfo=None)))
        return PerintahKerja(id=pk_id, mesin_id=str(input.mesin_id), judul=judul, prioritas=input.prioritas,
                             status="DIBUKA", dibuat_pada=now)


schema = strawberry.Schema(query=Query, mutation=Mutation,
                           extensions=[QueryDepthLimiter(max_depth=6), MaxAliasesLimiter(max_alias_count=15)])

app = FastAPI(title="Perawatan Prediktif Getaran", docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(GraphQLRouter(schema, graphql_ide="graphiql" if os.environ.get("GRAPHIQL") == "1" else None),
                   prefix="/graphql")


@app.get("/kesehatan")
def kesehatan():
    try:
        (r,) = kueri("SELECT max(diukur_pada) AS t FROM rms")
    except ValueError as e:
        raise HTTPException(503, str(e))
    return {"status": "ok", "data_terakhir": utc(r["t"]).isoformat() if r["t"] else None}


@app.get("/shared/{nama}")
def shared(nama: str):
    if nama not in ("charts.js", "charts.css"):
        raise HTTPException(404)
    return FileResponse(SHARED_DIR / nama)


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
