"""API dasbor Uji Akhir Lini Kulkas (FastAPI).

Cara menarik data: REST untuk ringkasan + long polling `/api/perubahan` yang menahan permintaan
sampai ada dokumen baru (berdasarkan `_ts` Cosmos DB) atau 25 detik berlalu.
"""
import os
import re
import sys
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common.aturan import ALASAN, BATAS, FPY_MIN_PERSEN, fpy  # noqa: E402
from common.cosmos import siapkan  # noqa: E402

app = FastAPI(title="API Uji Akhir Lini Kulkas", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[os.environ.get("ASAL_DASBOR", "http://localhost:18140")],
                   allow_methods=["GET"], allow_headers=[])
C: dict = {}
LINI = ("L1", "L2")
POLA_UNIT = re.compile(r"^[A-Z0-9-]{6,40}$")


def wadah():
    if not C:
        C.update(siapkan(tunggu_detik=30))
    return C


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def ringkas_unit(d: dict, kurva: bool = False) -> dict:
    out = {k: d[k] for k in ("unit", "lini", "model", "percobaan", "hasil", "alasan", "waktu", "bocor_g_tahun", "evap_c", "arus_a")}
    out["vakum_capai_s"] = d["vakum"]["waktu_capai_s"]
    out["vakum_akhir_pa"] = d["vakum"]["akhir_pa"]
    if kurva:
        out["vakum_kurva"] = d["vakum"]["kurva"]
    return out


@app.get("/api/health")
def health():
    try:
        wadah()["pengujian"].read()
        return {"status": "ok", "mode": os.environ.get("COSMOS_MODE", "emulator")}
    except Exception as e:
        raise HTTPException(503, f"Cosmos DB tidak terhubung: {e}")


@app.get("/api/ringkasan")
def ringkasan():
    c = wadah()
    sejak = iso(datetime.now(timezone.utc) - timedelta(hours=24))
    # ponytail: agregasi di Python atas ±1.500 dokumen 24 jam; pindah ke kueri GROUP BY / materialized view bila volume naik
    dok = list(c["pengujian"].query_items(
        "SELECT * FROM c WHERE c.waktu >= @s", parameters=[{"name": "@s", "value": sejak}], enable_cross_partition_query=True))
    dok.sort(key=lambda d: d["waktu"])
    jam_ini = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    # unit gagal percobaan 1 yang belum punya percobaan berikutnya
    diulang = {d["unit"] for d in dok if d["percobaan"] > 1}
    menunggu = [ringkas_unit(d) for d in reversed(dok) if d["percobaan"] == 1 and d["hasil"] == "gagal" and d["unit"] not in diulang]
    per_lini = {}
    for l in LINI:
        dl = [d for d in dok if d["lini"] == l]
        pertama = [d for d in dl if d["percobaan"] == 1]
        per_jam = []
        for h in range(23, -1, -1):
            a, b = iso(jam_ini - timedelta(hours=h)), iso(jam_ini - timedelta(hours=h - 1))
            per_jam.append({"jam": a, "fpy": fpy([d for d in pertama if a <= d["waktu"] < b]),
                            "unit": sum(1 for d in pertama if a <= d["waktu"] < b)})
        terakhir = dl[-1] if dl else None
        per_lini[l] = {
            "unit_24j": len(pertama), "fpy_24j": fpy(pertama), "fpy_20_terakhir": fpy(pertama[-20:]),
            "fpy_per_jam": per_jam, "terakhir": ringkas_unit(terakhir, kurva=True) if terakhir else None,
            "riwayat": [ringkas_unit(d) for d in reversed(dl[-10:])],
            "gagal_24j": sum(1 for d in pertama if d["hasil"] == "gagal"),
            "menunggu": sum(1 for u in menunggu if u["lini"] == l),
        }
    alasan = Counter(a for d in dok if d["percobaan"] == 1 for a in d["alasan"])
    alarm = list(c["alarm"].query_items(
        "SELECT * FROM c WHERE c.waktu >= @s", parameters=[{"name": "@s", "value": sejak}], enable_cross_partition_query=True))
    alarm.sort(key=lambda a: a["waktu"], reverse=True)
    return {
        "sekarang": iso(datetime.now(timezone.utc)), "batas": BATAS, "fpy_min": FPY_MIN_PERSEN,
        "lini": per_lini, "menunggu_ulang": menunggu[:12], "jumlah_menunggu": len(menunggu),
        "alasan_gagal": [{"kode": k, "label": ALASAN[k], "jumlah": n} for k, n in alasan.most_common()],
        "alarm": [{k: a[k] for k in ("id", "lini", "jenis", "tingkat", "unit", "waktu", "pesan")} for a in alarm[:8]],
        "ts": max((d["_ts"] for d in dok), default=0),
    }


@app.get("/api/unit/{unit}")
def unit(unit: str):
    if not POLA_UNIT.match(unit):
        raise HTTPException(400, "Nomor unit tidak valid. Gunakan huruf kapital, angka, dan tanda hubung.")
    dok = list(wadah()["pengujian"].query_items(
        "SELECT * FROM c WHERE c.unit = @u", parameters=[{"name": "@u", "value": unit}], enable_cross_partition_query=True))
    if not dok:
        raise HTTPException(404, f"Unit {unit} tidak ditemukan dalam data 90 hari terakhir.")
    return [ringkas_unit(d, kurva=True) for d in sorted(dok, key=lambda d: d["percobaan"])]


@app.get("/api/perubahan")
def perubahan(sejak: int = Query(..., ge=0, description="nilai `ts` terakhir yang dimiliki dasbor (detik epoch)"),
                    tunggu: int = Query(25, ge=0, le=25)):
    """Long polling: kembali segera bila ada dokumen dengan _ts > sejak, atau setelah `tunggu` detik."""
    batas = time.monotonic() + tunggu
    while True:
        baru = list(wadah()["pengujian"].query_items(
            "SELECT c.unit, c.lini, c.hasil, c._ts FROM c WHERE c._ts > @t", parameters=[{"name": "@t", "value": sejak}],
            enable_cross_partition_query=True))
        if baru or time.monotonic() >= batas:
            return {"ada_baru": bool(baru), "jumlah": len(baru), "ts": max([d["_ts"] for d in baru], default=sejak)}
        time.sleep(2)  # endpoint sinkron: FastAPI menjalankannya di threadpool, event loop tidak terblokir


@app.get("/")
def akar():
    return RedirectResponse("/web/index.html")


app.mount("/web", StaticFiles(directory="/srv/web", html=True), name="web")
app.mount("/shared", StaticFiles(directory="/srv/shared"), name="shared")
