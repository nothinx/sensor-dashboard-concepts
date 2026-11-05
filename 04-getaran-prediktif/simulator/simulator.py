"""Simulator sensor getaran: menulis file Parquet harian untuk RMS dan spektrum FFT, dibaca API lewat DuckDB.

Tata letak data (DATA_DIR):
  rms/tgl=YYYY-MM-DD.parquet        satu baris per mesin per pengukuran (UKUR_MENIT)
  spektrum/tgl=YYYY-MM-DD.parquet   satu baris per mesin per jam, kolom amplitudo = daftar 200 garis
  perintah_kerja/<id>.parquet       satu file per perintah kerja (ditulis API, contoh awal ditulis di sini)
Nilai deterministik per (mesin, slot waktu), jadi menulis ulang file hari ini selalu konsisten.
"""
import csv
import math
import os
import random
import tempfile
import time
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("DATA_DIR", "/data"))
MESIN_CSV = Path(os.environ.get("MESIN_CSV", ROOT / "db" / "mesin.csv"))
UKUR_MENIT = int(os.environ.get("UKUR_MENIT", "10"))
RIWAYAT_HARI = int(os.environ.get("RIWAYAT_HARI", "30"))
SPEKTRUM_HARI = int(os.environ.get("SPEKTRUM_HARI", "2"))
RESOLUSI_HZ = 2.0
JUMLAH_GARIS = 200  # 0 sampai 398 Hz
SENSOR_PUTUS = {"CV-TV": timedelta(hours=2)}  # skenario: sensor konveyor putus 2 jam sebelum simulator start


def muat_mesin():
    with MESIN_CSV.open(encoding="utf-8") as f:
        return [{**r, "rpm": float(r["rpm"]), "faktor_bpfo": float(r["faktor_bpfo"]), "rms_dasar": float(r["rms_dasar"]),
                 "suhu_dasar": float(r["suhu_dasar"]), "degradasi": float(r["degradasi"])} for r in csv.DictReader(f)]


def acak(mid, slot):
    return random.Random(zlib.crc32(f"{mid}|{slot}".encode()))


class Model:
    """Kondisi mesin terhadap waktu. Degradasi naik menurut kurva p^2,2 selama RIWAYAT_HARI sampai `jangkar`."""

    def __init__(self, jangkar):
        self.jangkar = jangkar
        self.awal = jangkar - timedelta(days=RIWAYAT_HARI - 1)

    def tingkat(self, m, t):
        p = min(1.0, max(0.0, (t - self.awal) / (self.jangkar - self.awal)))
        return m["degradasi"] * p ** 2.2

    def rms(self, m, t, slot):
        r = acak(m["id"], slot)
        jam = t.astimezone(timezone(timedelta(hours=7))).hour
        v = (m["rms_dasar"] + self.tingkat(m, t)) * (1 + 0.04 * math.sin(jam / 24 * 2 * math.pi)) * (1 + r.gauss(0, 0.03))
        s = m["suhu_dasar"] + 2.5 * math.sin((jam - 8) / 24 * 2 * math.pi) + 3 * self.tingkat(m, t) + r.gauss(0, 0.4)
        return round(v, 3), round(s, 1)

    def spektrum(self, m, t, slot):
        r = acak(m["id"], f"fft{slot}")
        a = [0.03 + r.random() * 0.06 for _ in range(JUMLAH_GARIS)]
        f1 = m["rpm"] / 60
        bpfo = f1 * m["faktor_bpfo"]
        cacat = self.tingkat(m, t)
        puncak = [(f1, 0.45 * m["rms_dasar"]), (2 * f1, 0.18 * m["rms_dasar"]), (3 * f1, 0.06 * m["rms_dasar"]),
                  (bpfo, 0.08 + 0.9 * cacat), (2 * bpfo, 0.04 + 0.45 * cacat), (3 * bpfo, 0.02 + 0.2 * cacat)]
        for f, amp in puncak:
            i = round(f / RESOLUSI_HZ)
            if 0 < i < JUMLAH_GARIS - 1:
                a[i] += amp * (1 + r.gauss(0, 0.05))
                a[i - 1] += amp * 0.25
                a[i + 1] += amp * 0.25
        return ";".join(f"{x:.3f}" for x in a)


def tulis(con, rows, kolom, pilih, tujuan):
    """Tulis baris ke Parquet lewat CSV sementara, lalu ganti file tujuan secara atomik."""
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)
        nama_csv = f.name
    tmp = tujuan.with_suffix(".tmp")
    cols = ", ".join(f"'{k}': '{t}'" for k, t in kolom)
    con.execute(f"COPY (SELECT {pilih} FROM read_csv('{nama_csv}', header=false, columns={{{cols}}})) "
                f"TO '{tmp}' (FORMAT PARQUET)")
    os.replace(tmp, tujuan)
    os.unlink(nama_csv)


def tulis_hari(con, mesin, model, hari, sampai):
    """Bangun ulang file rms & spektrum untuk satu hari (UTC) sampai waktu `sampai`."""
    mulai = datetime(hari.year, hari.month, hari.day, tzinfo=timezone.utc)
    rms_rows, fft_rows = [], []
    t = mulai
    while t < min(mulai + timedelta(days=1), sampai):
        slot = int(t.timestamp())
        for m in mesin:
            putus = SENSOR_PUTUS.get(m["id"])
            if putus and t > model.jangkar - putus:
                continue
            v, s = model.rms(m, t, slot)
            rms_rows.append((m["id"], t.strftime("%Y-%m-%d %H:%M:%S"), v, s, m["rpm"]))
            if t.minute == 0 and t >= sampai - timedelta(days=SPEKTRUM_HARI):
                fft_rows.append((m["id"], t.strftime("%Y-%m-%d %H:%M:%S"), RESOLUSI_HZ, model.spektrum(m, t, slot)))
        t += timedelta(minutes=UKUR_MENIT)
    tgl = hari.strftime("%Y-%m-%d")
    if rms_rows:
        tulis(con, rms_rows, [("mesin_id", "VARCHAR"), ("diukur_pada", "TIMESTAMP"), ("rms_mm_s", "DOUBLE"),
                              ("suhu_c", "DOUBLE"), ("rpm", "DOUBLE")], "*", DATA / "rms" / f"tgl={tgl}.parquet")
    if fft_rows:
        tulis(con, fft_rows, [("mesin_id", "VARCHAR"), ("diukur_pada", "TIMESTAMP"), ("resolusi_hz", "DOUBLE"), ("a", "VARCHAR")],
              "mesin_id, diukur_pada, resolusi_hz, CAST(string_split(a, ';') AS DOUBLE[]) AS amplitudo",
              DATA / "spektrum" / f"tgl={tgl}.parquet")


def contoh_perintah_kerja(con):
    d = DATA / "perintah_kerja"
    if d.exists() and any(d.glob("*.parquet")):
        return
    d.mkdir(parents=True, exist_ok=True)
    dibuat = (datetime.now(timezone.utc) - timedelta(days=12)).strftime("%Y-%m-%d %H:%M:%S")
    con.execute(
        f"COPY (SELECT 'PK-0001' AS id, 'P-01' AS mesin_id, 'Pelumasan ulang bearing sisi penggerak' AS judul, "
        f"'SEDANG' AS prioritas, 'SELESAI' AS status, TIMESTAMP '{dibuat}' AS dibuat_pada) "
        f"TO '{d / 'PK-0001.parquet'}' (FORMAT PARQUET)")


def main():
    con = duckdb.connect()
    mesin = muat_mesin()
    now = datetime.now(timezone.utc)
    model = Model(now)
    contoh_perintah_kerja(con)
    t0 = time.time()
    for k in range(RIWAYAT_HARI, -1, -1):
        tulis_hari(con, mesin, model, (now - timedelta(days=k)).date(), now)
    print(f"simulator: riwayat {RIWAYAT_HARI} hari ditulis dalam {time.time() - t0:.1f} dtk", flush=True)
    while True:
        time.sleep(UKUR_MENIT * 60 - time.time() % (UKUR_MENIT * 60) + 1)
        now = datetime.now(timezone.utc)
        tulis_hari(con, mesin, model, now.date(), now)


if __name__ == "__main__":
    main()
