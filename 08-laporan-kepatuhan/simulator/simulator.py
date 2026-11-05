"""Simulator kepatuhan: mengisi ringkasan_harian per area (data contoh).

Start pertama: isi 30 hari ke belakang sampai detik ini. Setelah itu tiap TICK detik menambah waktu terpantau
dan waktu dalam syarat untuk hari ini. Penyimpangan (ekskursi) muncul acak sesuai profil tiap area.
"""
import datetime as dt
import os
import random
import time

import psycopg

TICK = int(os.environ.get("TICK_DETIK", "10"))
HARI_BACKFILL = 30
# kode area: (peluang ekskursi per jam, durasi minimum menit, durasi maksimum menit)
PROFIL = {
    "SMT-L1": (0.02, 3, 15), "SMT-L2": (0.03, 5, 30), "PRK-TV": (0.005, 3, 10), "PRK-KL": (0.01, 3, 12),
    "UTL": (0.04, 10, 40), "GDG": (0.003, 5, 20), "CSB": (0.015, 5, 25), "SRV": (0.002, 2, 8),
}


def detik_hilang(kode, tanggal, sampai_detik):
    """Total detik di luar syarat untuk satu hari historis (deterministik per area+tanggal)."""
    p, dmin, dmaks = PROFIL[kode]
    r = random.Random(f"{kode}{tanggal}")
    hilang = 0
    for jam in range(int(sampai_detik // 3600)):
        if r.random() < p:
            hilang += r.uniform(dmin, dmaks) * 60
    return int(min(hilang, sampai_detik))


def backfill(c, area):
    if c.execute("SELECT count(*) FROM ringkasan_harian").fetchone()[0]:
        return
    sekarang = dt.datetime.now()
    hari_ini = sekarang.date()
    detik_ini = int((sekarang - sekarang.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds())
    rows = []
    for k in range(HARI_BACKFILL, -1, -1):
        tanggal = hari_ini - dt.timedelta(days=k)
        total = 86400 if k else detik_ini
        for aid, kode in area:
            rows.append((aid, tanggal, total, total - detik_hilang(kode, tanggal, total)))
    with c.cursor() as cur:
        cur.executemany("INSERT INTO ringkasan_harian (area_id, tanggal, detik_total, detik_sesuai) VALUES (%s, %s, %s, %s)", rows)
    print(f"backfill {len(rows)} baris ringkasan harian")


def main():
    url = os.environ["DATABASE_URL"]
    for _ in range(30):
        try:
            conn = psycopg.connect(url, autocommit=True)
            break
        except psycopg.OperationalError:
            time.sleep(2)
    else:
        raise SystemExit("basis data tidak bisa dihubungi")
    area = conn.execute("SELECT id, kode FROM area ORDER BY urutan").fetchall()
    backfill(conn, area)
    rnd = random.Random()
    ekskursi = {kode: 0.0 for _, kode in area}
    ekskursi["SMT-L2"] = time.time() + 30 * 60  # skenario: SMT Line 2 sedang menyimpang saat start
    print(f"simulator jalan, tick {TICK} dtk")
    while True:
        now = time.time()
        hari = dt.date.today()
        for aid, kode in area:
            p, dmin, dmaks = PROFIL[kode]
            if ekskursi[kode] < now and rnd.random() < p * TICK / 3600:
                ekskursi[kode] = now + rnd.uniform(dmin, dmaks) * 60
            sesuai = 0 if ekskursi[kode] > now else TICK
            conn.execute(
                """INSERT INTO ringkasan_harian AS r (area_id, tanggal, detik_total, detik_sesuai) VALUES (%s, %s, %s, %s)
                   ON CONFLICT (area_id, tanggal) DO UPDATE SET
                     detik_total = LEAST(86400, r.detik_total + EXCLUDED.detik_total),
                     detik_sesuai = LEAST(LEAST(86400, r.detik_total + EXCLUDED.detik_total), r.detik_sesuai + EXCLUDED.detik_sesuai)""",
                (aid, hari, TICK, sesuai))
        time.sleep(TICK)


if __name__ == "__main__":
    main()
