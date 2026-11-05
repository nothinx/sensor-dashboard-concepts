"""Simulator power meter: mengisi tabel `pembacaan` (interval 15 menit) dan `sesaat` (tiap SESAAT_DETIK).

Hanya pustaka standar. Saat start, riwayat RIWAYAT_HARI hari diisi (backfill) supaya grafik langsung penuh.
Nilai per interval deterministik (seed dari meter + waktu), jadi backfill ulang menghasilkan angka yang sama.
"""
import math
import os
import random
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

WIB = timezone(timedelta(hours=7))
DB_PATH = os.environ.get("DB_PATH", "/data/energi.db")
SKEMA = Path(os.environ.get("SKEMA_PATH", Path(__file__).resolve().parent.parent / "db" / "skema.sql"))
SESAAT_DETIK = int(os.environ.get("SESAAT_DETIK", "60"))
RIWAYAT_HARI = int(os.environ.get("RIWAYAT_HARI", "8"))
INTERVAL = 900

# beban dasar saat produksi penuh (kW), faktor daya, THD-I (%), ketidakseimbangan khas
SUB = {
    "PM-SMT": (470, 0.95, 4.8, 0.03),
    "PM-KMP": (205, 0.82, 9.7, 0.18),
    "PM-HVAC": (300, 0.91, 6.2, 0.04),
    "PM-TV": (165, 0.93, 11.4, 0.03),
    "PM-KLK": (140, 0.92, 8.9, 0.04),
    "PM-GDG": (82, 0.89, 5.2, 0.08),
    "PM-KTR": (45, 0.96, 7.5, 0.05),
}
RUGI_DISTRIBUSI = 1.015  # MDP = jumlah SDP + rugi kabel/trafo (perkiraan)


def buka(path=DB_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SKEMA.read_text(encoding="utf-8"))
    return conn


def profil(t):
    """Faktor beban 0..1 menurut jam kerja (2 shift 07.00-23.00) dan hari."""
    h = t.hour + t.minute / 60
    if 7 <= h < 23:
        f = 1.0
    elif 6 <= h < 7:
        f = 0.45 + 0.55 * (h - 6)
    else:
        f = 0.45
    if t.weekday() == 6:  # Minggu: hanya utilitas & cold storage
        f *= 0.5
    return f


def kw_sub(mid, t, r):
    base, *_ = SUB[mid]
    f = profil(t)
    h = t.hour + t.minute / 60
    if mid == "PM-HVAC":  # ikut suhu luar, puncak sekitar 14.00
        f *= 0.8 + 0.25 * math.cos((h - 14) / 24 * 2 * math.pi)
    if mid == "PM-KMP":  # kompresor load/unload + unit kedua menyala 13.00-13.30 pada hari kerja
        f *= 0.9 + 0.1 * math.sin(h * 1.3)
        if 13 <= h < 13.5 and t.weekday() < 6:
            f += 0.3
    if mid in ("PM-GDG", "PM-KTR") and not (7 <= h < 23):
        f = max(f, 0.7 if mid == "PM-GDG" else 0.2)
    return max(0.0, base * f * (1 + r.gauss(0, 0.03)))


def interval(ts):
    """Baris pembacaan semua meter untuk interval yang dimulai pada ts (epoch UTC)."""
    t = datetime.fromtimestamp(ts + INTERVAL / 2, WIB)
    rows, total_kw, total_kvar = [], 0.0, 0.0
    for i, mid in enumerate(SUB):
        r = random.Random(ts // INTERVAL * 97 + i)
        kw = kw_sub(mid, t, r)
        pf = min(0.99, SUB[mid][1] + r.gauss(0, 0.01))
        rows.append((mid, ts, kw * 0.25, kw, kw * (1 + abs(r.gauss(0.04, 0.02))), pf))
        total_kw += kw
        total_kvar += kw * math.tan(math.acos(pf))
    kw = total_kw * RUGI_DISTRIBUSI
    pf = total_kw / math.hypot(total_kw, total_kvar)
    rows.append(("PM-MDP", ts, kw * 0.25, kw, kw * 1.03, pf))  # demand maks ≈ 3 % di atas rata-rata interval
    return [(m, s, round(a, 3), round(b, 2), round(c, 2), round(d, 3)) for m, s, a, b, c, d in rows]


def isi_interval(conn, sampai):
    """Sisipkan semua interval lengkap yang belum ada sampai epoch `sampai` (eksklusif)."""
    akhir = sampai // INTERVAL * INTERVAL
    (terakhir,) = conn.execute("SELECT MAX(ts) FROM pembacaan WHERE meter_id='PM-MDP'").fetchone()
    mulai = terakhir + INTERVAL if terakhir else akhir - RIWAYAT_HARI * 86400
    n = 0
    with conn:
        for ts in range(mulai, akhir, INTERVAL):
            conn.executemany("INSERT OR IGNORE INTO pembacaan VALUES (?,?,?,?,?,?)", interval(ts))
            n += 1
    return n


def sesaat(conn, now):
    t = datetime.fromtimestamp(now, WIB)
    r = random.Random()
    rows, total_kw, total_i = [], 0.0, [0.0, 0.0, 0.0]
    for mid, (base, pf0, thd, tak_imbang) in SUB.items():
        kw = kw_sub(mid, t, r)
        pf = min(0.99, pf0 + r.gauss(0, 0.01))
        v = [round(230 + r.gauss(0, 1.2), 1) for _ in range(3)]
        i_rata = kw * 1000 / (3 * (sum(v) / 3) * pf)
        # fasa S paling ringan pada panel dengan ketidakseimbangan khas tinggi
        i = [i_rata * (1 + tak_imbang / 3), i_rata * (1 - 2 * tak_imbang / 3), i_rata * (1 + tak_imbang / 3)]
        i = [round(x * (1 + r.gauss(0, 0.01)), 1) for x in i]
        rows.append((mid, int(now), round(kw, 1), *v, *i, round(pf, 3), round(thd + r.gauss(0, 0.3), 1)))
        total_kw += kw
        total_i = [a + b for a, b in zip(total_i, i)]
    v = [round(229 + r.gauss(0, 1), 1) for _ in range(3)]
    kw = total_kw * RUGI_DISTRIBUSI
    rows.append(("PM-MDP", int(now), round(kw, 1), *v, *[round(x, 1) for x in total_i], 0.92, 6.1))
    with conn:
        conn.executemany("INSERT OR REPLACE INTO sesaat VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)


def main():
    conn = buka()
    print(f"simulator: backfill {isi_interval(conn, int(time.time()))} interval", flush=True)
    while True:
        now = time.time()
        isi_interval(conn, int(now))
        sesaat(conn, now)
        time.sleep(SESAAT_DETIK)


if __name__ == "__main__":
    main()
