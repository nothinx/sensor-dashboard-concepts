"""API Laporan Kepatuhan Mutu (FastAPI + PostgreSQL).

REST + OpenAPI, paginasi kursor, dan pembuatan laporan asinkron (POST -> 202, lalu GET status).
Juga menyajikan dasbor statis dari WEB_DIR dan pustaka grafik bersama dari SHARED_DIR.
"""
import base64
import datetime as dt
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import BaseModel, Field, model_validator

from berkas import csv_bytes, pdf_bytes, persen, tgl

log = logging.getLogger("mutu")
AMBANG = float(os.environ.get("AMBANG_PERSEN", "99"))
MAKS_HARI = 93
pool = ConnectionPool(os.environ.get("DATABASE_URL", "postgresql://mutu:mutu@db:5432/mutu"), open=False,
                      kwargs={"row_factory": dict_row})


@asynccontextmanager
async def lifespan(app):
    pool.open(wait=True, timeout=30)
    with pool.connection() as c:  # laporan yang terputus karena server restart ditandai gagal
        aktor(c, "sistem")
        c.execute("UPDATE laporan SET status = 'gagal', selesai_pada = now(), pesan_galat = %s "
                  "WHERE status IN ('antri', 'proses')",
                  ("Server dimulai ulang saat laporan disusun. Terbitkan ulang laporan ini.",))
    yield
    pool.close()


app = FastAPI(
    title="API Laporan Kepatuhan Mutu",
    version="1.0.0",
    description="Mockup proyek 08 klien. Semua data adalah data contoh dari simulator.",
    lifespan=lifespan,
)


def aktor(conn, nama):
    conn.execute("SELECT set_config('app.aktor', %s, true)", (nama,))


def nama_aktor(x_aktor: str | None) -> str:
    v = (x_aktor or "").strip()
    if not v:
        return "anonim"
    if not re.fullmatch(r"[\w .,'()-]{1,60}", v):
        raise HTTPException(400, "Header X-Aktor hanya boleh huruf, angka, spasi, dan tanda baca dasar (maks. 60 karakter).")
    return v


# ---------- model ----------
class LaporanBaru(BaseModel):
    jenis: Literal["kepatuhan", "jejak_audit"] = Field(description="kepatuhan = persen waktu dalam syarat per area per hari")
    area: str | None = Field(None, pattern=r"^[A-Z0-9-]{2,16}$", description="kode area; kosong = semua area")
    dari: dt.date
    sampai: dt.date
    format: Literal["csv", "pdf"]

    @model_validator(mode="after")
    def cek_rentang(self):
        if self.sampai < self.dari:
            raise ValueError("Tanggal akhir lebih awal dari tanggal mulai.")
        if (self.sampai - self.dari).days + 1 > MAKS_HARI:
            raise ValueError(f"Rentang maksimal {MAKS_HARI} hari. Bagi laporan per bulan.")
        return self


class Laporan(BaseModel):
    id: uuid.UUID
    nomor: str
    jenis: str
    area: str | None
    dari: dt.date
    sampai: dt.date
    format: str
    status: Literal["antri", "proses", "selesai", "gagal"]
    progres: int
    pesan_galat: str | None
    dibuat_oleh: str
    dibuat_pada: dt.datetime
    selesai_pada: dt.datetime | None
    url_berkas: str | None


class HalamanLaporan(BaseModel):
    data: list[Laporan]
    cursor_berikut: str | None


class Audit(BaseModel):
    id: int
    waktu: dt.datetime
    aktor: str
    aksi: str
    tabel: str
    rekaman: str
    perubahan: dict


class HalamanAudit(BaseModel):
    data: list[Audit]
    cursor_berikut: str | None


SELECT_LAPORAN = """SELECT l.id, l.nomor, l.jenis, a.kode AS area, l.dari, l.sampai, l.format, l.status, l.progres,
  l.pesan_galat, l.dibuat_oleh, l.dibuat_pada, l.selesai_pada FROM laporan l LEFT JOIN area a ON a.id = l.area_id"""


def ke_laporan(r):
    return Laporan(**r, url_berkas=f"/api/v1/laporan/{r['id']}/berkas" if r["status"] == "selesai" else None)


def enc(*parts):
    return base64.urlsafe_b64encode("|".join(map(str, parts)).encode()).decode().rstrip("=")


def dec(cursor, *tipe):
    """Urai kursor menjadi nilai bertipe; kursor rusak atau dimanipulasi -> 400, bukan 500."""
    try:
        parts = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode().split("|")
        if len(parts) != len(tipe):
            raise ValueError
        return [t(p) for t, p in zip(tipe, parts)]
    except Exception:
        raise HTTPException(400, "Kursor tidak valid. Mulai lagi dari halaman pertama tanpa parameter cursor.")


# ---------- endpoint ----------
@app.get("/healthz", tags=["sistem"])
def healthz():
    with pool.connection() as c:
        c.execute("SELECT 1")
    return {"status": "ok"}


@app.get("/api/v1/area", tags=["referensi"])
def daftar_area():
    with pool.connection() as c:
        return c.execute("SELECT kode, nama FROM area ORDER BY urutan").fetchall()


@app.get("/api/v1/kepatuhan", tags=["kepatuhan"])
def kepatuhan(sampai: dt.date | None = None, hari: int = Query(7, ge=1, le=31)):
    """Persen waktu semua sensor area dalam batas, per area per hari."""
    sampai = sampai or dt.date.today()
    dari = sampai - dt.timedelta(days=hari - 1)
    with pool.connection() as c:
        rows = c.execute(
            """SELECT a.kode, a.nama, d::date AS tanggal, r.detik_total, r.detik_sesuai
               FROM area a CROSS JOIN generate_series(%s::date, %s::date, interval '1 day') d
               LEFT JOIN ringkasan_harian r ON r.area_id = a.id AND r.tanggal = d::date
               ORDER BY a.urutan, d""", (dari, sampai)).fetchall()
    area = {}
    for r in rows:
        a = area.setdefault(r["kode"], {"kode": r["kode"], "nama": r["nama"], "harian": [], "_t": 0, "_s": 0})
        tot, ok = r["detik_total"] or 0, r["detik_sesuai"] or 0
        a["harian"].append({"tanggal": r["tanggal"], "detik_total": tot, "persen": round(ok / tot * 100, 2) if tot else None})
        a["_t"] += tot
        a["_s"] += ok
    for a in area.values():
        t, s = a.pop("_t"), a.pop("_s")
        a["persen_periode"] = round(s / t * 100, 2) if t else None
    return {"dari": dari, "sampai": sampai, "ambang_persen": AMBANG, "area": list(area.values())}


@app.get("/api/v1/laporan", response_model=HalamanLaporan, tags=["laporan"])
def daftar_laporan(limit: int = Query(10, ge=1, le=100), cursor: str | None = None):
    sql, args = SELECT_LAPORAN, []
    if cursor:
        waktu, lid = dec(cursor, dt.datetime.fromisoformat, uuid.UUID)
        sql += " WHERE (l.dibuat_pada, l.id) < (%s, %s)"
        args += [waktu, lid]
    sql += " ORDER BY l.dibuat_pada DESC, l.id DESC LIMIT %s"
    with pool.connection() as c:
        rows = c.execute(sql, args + [limit + 1]).fetchall()
    nxt = enc(rows[limit - 1]["dibuat_pada"].isoformat(), rows[limit - 1]["id"]) if len(rows) > limit else None
    return {"data": [ke_laporan(r) for r in rows[:limit]], "cursor_berikut": nxt}


@app.post("/api/v1/laporan", status_code=202, response_model=Laporan, tags=["laporan"])
def buat_laporan(body: LaporanBaru, bg: BackgroundTasks, response: Response,
                 x_aktor: str | None = Header(None, description="Nama penyusun untuk jejak audit")):
    nama = nama_aktor(x_aktor)
    with pool.connection() as c:
        aktor(c, nama)
        area_id = None
        if body.area:
            row = c.execute("SELECT id FROM area WHERE kode = %s", (body.area,)).fetchone()
            if not row:
                raise HTTPException(422, f"Area {body.area} tidak dikenal. Ambil daftar kode dari /api/v1/area.")
            area_id = row["id"]
        lid = c.execute(
            """INSERT INTO laporan (nomor, jenis, area_id, dari, sampai, format, dibuat_oleh)
               VALUES ('QA/LK/' || to_char(now(), 'YYYY/MM') || '/' || lpad(nextval('laporan_nomor_seq')::text, 4, '0'),
                       %s, %s, %s, %s, %s, %s) RETURNING id""",
            (body.jenis, area_id, body.dari, body.sampai, body.format, nama)).fetchone()["id"]
        row = c.execute(SELECT_LAPORAN + " WHERE l.id = %s", (lid,)).fetchone()
    bg.add_task(susun, lid)
    response.headers["Location"] = f"/api/v1/laporan/{lid}"
    return ke_laporan(row)


@app.get("/api/v1/laporan/{lid}", response_model=Laporan, tags=["laporan"])
def status_laporan(lid: uuid.UUID):
    with pool.connection() as c:
        row = c.execute(SELECT_LAPORAN + " WHERE l.id = %s", (lid,)).fetchone()
    if not row:
        raise HTTPException(404, "Laporan tidak ditemukan.")
    return ke_laporan(row)


@app.get("/api/v1/laporan/{lid}/berkas", tags=["laporan"], response_class=Response,
         responses={200: {"content": {"application/pdf": {}, "text/csv": {}}}})
def unduh(lid: uuid.UUID):
    with pool.connection() as c:
        row = c.execute("SELECT status, format, nama_berkas, berkas FROM laporan WHERE id = %s", (lid,)).fetchone()
    if not row:
        raise HTTPException(404, "Laporan tidak ditemukan.")
    if row["status"] != "selesai":
        raise HTTPException(409, f"Laporan belum bisa diunduh karena berstatus {row['status']}.")
    media = "application/pdf" if row["format"] == "pdf" else "text/csv; charset=utf-8"
    return Response(bytes(row["berkas"]), media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{row["nama_berkas"]}"'})


@app.get("/api/v1/audit", response_model=HalamanAudit, tags=["audit"])
def daftar_audit(limit: int = Query(20, ge=1, le=100), cursor: str | None = None):
    sql, args = "SELECT * FROM jejak_audit", []
    if cursor:
        (cid,) = dec(cursor, int)
        sql += " WHERE id < %s"
        args.append(cid)
    with pool.connection() as c:
        rows = c.execute(sql + " ORDER BY id DESC LIMIT %s", args + [limit + 1]).fetchall()
    return {"data": rows[:limit], "cursor_berikut": enc(rows[limit - 1]["id"]) if len(rows) > limit else None}


# ---------- penyusun laporan (tugas latar) ----------
class Gagal(Exception):
    pass


def ubah(lid, **kol):
    sets = ", ".join(f"{k} = %s" for k in kol)
    with pool.connection() as c:
        aktor(c, "sistem")
        c.execute(f"UPDATE laporan SET {sets} WHERE id = %s", (*kol.values(), lid))


def susun(lid):
    # ponytail: tugas latar di proses API; hilang bila server restart (ditandai gagal saat start).
    # Pindah ke antrean (mis. Celery/RQ) bila laporan besar atau banyak penyusun.
    try:
        ubah(lid, status="proses", progres=10)
        for p in (35, 60, 85):
            time.sleep(0.6)  # jeda buatan agar progres terlihat di mockup
            ubah(lid, progres=p)
        with pool.connection() as c:
            lap = c.execute("SELECT l.*, a.nama AS nama_area FROM laporan l LEFT JOIN area a ON a.id = l.area_id "
                            "WHERE l.id = %s", (lid,)).fetchone()
            data, nama = (isi_kepatuhan if lap["jenis"] == "kepatuhan" else isi_audit)(c, lap)
        ubah(lid, status="selesai", progres=100, berkas=data, nama_berkas=nama, selesai_pada=dt.datetime.now(dt.timezone.utc))
    except Gagal as e:
        ubah(lid, status="gagal", pesan_galat=str(e), selesai_pada=dt.datetime.now(dt.timezone.utc))
    except Exception:
        log.exception("laporan %s gagal", lid)
        ubah(lid, status="gagal", selesai_pada=dt.datetime.now(dt.timezone.utc),
             pesan_galat="Galat internal saat menyusun laporan. Coba lagi; bila berulang, hubungi admin sistem.")


def kepala(lap, judul):
    return [
        judul, "",
        f"Nomor dokumen : {lap['nomor']}",
        f"Periode       : {tgl(lap['dari'])} sampai {tgl(lap['sampai'])}",
        f"Area          : {lap['nama_area'] or 'Semua area'}",
        f"Disusun oleh  : {lap['dibuat_oleh']}, {tgl(lap['dibuat_pada'].date())}",
        "Sumber        : basis data kepatuhan (data contoh simulator)", "",
    ]


def isi_kepatuhan(c, lap):
    rows = c.execute(
        """SELECT r.tanggal, a.kode, a.nama, r.detik_total, r.detik_sesuai FROM ringkasan_harian r
           JOIN area a ON a.id = r.area_id
           WHERE r.tanggal BETWEEN %s AND %s AND (%s::smallint IS NULL OR r.area_id = %s) AND r.detik_total > 0
           ORDER BY r.tanggal, a.urutan""", (lap["dari"], lap["sampai"], lap["area_id"], lap["area_id"])).fetchall()
    if not rows:
        awal = c.execute("SELECT min(tanggal) AS t FROM ringkasan_harian").fetchone()["t"]
        saran = f" Data tersedia mulai {tgl(awal)}." if awal else ""
        raise Gagal(f"Tidak ada data kepatuhan untuk {tgl(lap['dari'])} sampai {tgl(lap['sampai'])}.{saran} Pilih periode lain.")
    pct = lambda r: r["detik_sesuai"] / r["detik_total"] * 100
    nama = f"{lap['nomor'].replace('/', '-')}.{lap['format']}"
    if lap["format"] == "csv":
        return csv_bytes(["tanggal", "kode_area", "nama_area", "detik_total", "detik_sesuai", "persen_sesuai"],
                         [[r["tanggal"], r["kode"], r["nama"], r["detik_total"], r["detik_sesuai"], f"{pct(r):.2f}"] for r in rows]), nama
    baris = kepala(lap, "Laporan kepatuhan lingkungan produksi")
    baris += [f"Syarat: semua sensor area dalam batas minimal {persen(AMBANG)} % waktu.", "",
              f"{'Tanggal':<20}{'Area':<24}{'Dalam syarat':>14}  Keterangan", "-" * 72]
    for r in rows:
        p = pct(r)
        baris.append(f"{tgl(r['tanggal']):<20}{r['nama'][:23]:<24}{persen(p) + ' %':>14}  {'memenuhi' if p >= AMBANG else 'di bawah syarat'}")
    baris += ["", "Diperiksa oleh : ______________________  (Manajer Mutu)", "Tanggal        : ______________________"]
    return pdf_bytes(baris), nama


def isi_audit(c, lap):
    rows = c.execute("SELECT * FROM jejak_audit WHERE waktu >= %s AND waktu < %s + 1 ORDER BY id",
                     (lap["dari"], lap["sampai"])).fetchall()
    if not rows:
        raise Gagal(f"Tidak ada catatan audit untuk {tgl(lap['dari'])} sampai {tgl(lap['sampai'])}. Pilih periode lain.")
    nama = f"{lap['nomor'].replace('/', '-')}.{lap['format']}"
    if lap["format"] == "csv":
        import json
        return csv_bytes(["id", "waktu", "aktor", "aksi", "tabel", "rekaman", "perubahan"],
                         [[r["id"], r["waktu"].isoformat(), r["aktor"], r["aksi"], r["tabel"], r["rekaman"],
                           json.dumps(r["perubahan"], ensure_ascii=False, default=str)] for r in rows]), nama
    baris = kepala(lap, "Ekspor jejak audit") + [f"{'Waktu':<18}{'Aktor':<22}{'Aksi':<8}{'Rekaman'}", "-" * 72]
    baris += [f"{r['waktu'].astimezone().strftime('%d-%m-%Y %H.%M'):<18}{r['aktor'][:21]:<22}{r['aksi']:<8}{r['tabel']} {r['rekaman']}"[:80]
              for r in rows]
    return pdf_bytes(baris), nama


# Dasbor statis disajikan dari origin yang sama, jadi CORS tidak dibuka sama sekali.
app.mount("/shared", StaticFiles(directory=os.environ.get("SHARED_DIR", "/srv/shared")), name="shared")
app.mount("/", StaticFiles(directory=os.environ.get("WEB_DIR", "/srv/web"), html=True), name="web")
