"""Simulator proyek 02: oven reflow 2 lini x 10 zona ke InfluxDB 2.

Mengisi riwayat 24 jam (1 menit sekali) saat start, lalu menulis tiap 5 detik. Setiap 10 menit
satu papan uji berprobe melewati oven per lini (profil termal 60 titik, 5 detik sekali).
Kejadian contoh: Line 2 zona 6 naik 7 °C sejak 40 menit sebelum start, setelah konveyor diperlambat.
"""
import math
import os
import time

from influxdb_client import InfluxDBClient
from influxdb_client.client.write_api import SYNCHRONOUS

BUCKET = os.environ["INFLUX_BUCKET"]
ORG = os.environ["INFLUX_ORG"]
MIN, HOUR, DAY = 60, 3600, 86400
S = time.time()
TZ = int(os.environ.get("TZ_OFFSET_MIN", "420")) * MIN
SETPOINT = [120, 150, 165, 175, 185, 245, 255, 250, 120, 80]
HEATER = [42, 38, 35, 33, 37, 64, 71, 64, 0, 0]
FAN = [1450, 1450, 1500, 1500, 1500, 1800, 1800, 1800, 2100, 2100]
SHIFT_STARTS = [6, 14, 22]


def noise(seed: float, t: float, amp: float) -> float:
    x = math.sin(seed * 12.9898 + math.floor(t / 5) * 78.233) * 43758.5453
    return (x - math.floor(x) - 0.5) * 2 * amp


def l2_event(t: float) -> float:
    """0..1: kenaikan zona 6 Line 2 dalam 40 menit sebelum start, lalu bertahan."""
    return min(1.0, max(0.0, (t - (S - 40 * MIN)) / (40 * MIN)))


def conveyor(line: str, t: float) -> float:
    if line == "L2" and t > S - 42 * MIN:
        return 0.75
    return 0.90


def boards_shift(line: str, t: float) -> int:
    """Jumlah papan sejak awal shift berjalan (sekitar 4,6 papan per menit pada 0,90 m/mnt)."""
    local_h = ((t + TZ) % DAY) / HOUR
    start_h = max(h for h in SHIFT_STARTS if h <= local_h) if local_h >= SHIFT_STARTS[0] else SHIFT_STARTS[-1] - 24
    minutes = (local_h - start_h) * 60
    return int(minutes * 4.6 * conveyor(line, t) / 0.90) + (7 if line == "L1" else 0)


def zone_points(t: float) -> list[str]:
    ns = int(t * 1e9)
    out = []
    for line in ("L1", "L2"):
        for i, sp in enumerate(SETPOINT):
            z = f"Z{i + 1}"
            seed = (1 if line == "L1" else 50) + i
            actual = sp + noise(seed, t, 0.6)
            heater = HEATER[i] + noise(seed + 100, t, 2)
            if line == "L2" and z == "Z6":
                actual += 7 * l2_event(t)
                heater = 64 + 36 * l2_event(t)  # pemanas tertahan 100 %: kontrol tidak lagi menurunkan daya
            if line == "L1" and z == "Z6" and S - 18 * HOUR < t < S - 17.25 * HOUR:
                actual += 3.4
            out.append(
                f"zone,line={line},zone={z} actual={actual:.2f},setpoint={sp:.1f},"
                f"heater_pct={max(0.0, min(100.0, heater)):.1f},fan_rpm={FAN[i] + noise(seed + 200, t, 15):.0f} {ns}"
            )
        o2 = (760 if line == "L1" else 820) + noise(90 if line == "L1" else 91, t, 35)
        out.append(
            f"oven,line={line} o2_ppm={o2:.0f},conveyor_mpm={conveyor(line, t):.2f},conveyor_recipe_mpm=0.90,"
            f"boards_shift={boards_shift(line, t)} {ns}"
        )
    return out


def profile_points(line: str, start: float) -> list[str]:
    """Satu lintasan papan uji: pemanasan, soak, reflow, pendinginan (300 detik)."""
    extra = 7 * l2_event(start) * 0.55 if line == "L2" else 0.0
    run = time.strftime("%Y%m%d%H%M", time.gmtime(start))
    out = []
    for k in range(60):
        s = k * 5
        if s < 90:
            temp = 30 + s * 1.6
        elif s < 180:
            temp = 174 + (s - 90) * 0.25
        elif s < 230:
            temp = 196 + (s - 180) * (1.0 + extra / 50)
        elif s < 250:
            temp = 246 + extra - (s - 230) * 0.2
        else:
            temp = max(60.0, 242 + extra - (s - 250) * 2.6)
        temp += noise(300 + k + (0 if line == "L1" else 70), start, 0.4)
        out.append(f"profile,line={line},run={run} temp={temp:.1f} {int((start + s) * 1e9)}")
    return out


def main() -> None:
    client = InfluxDBClient(url=os.environ["INFLUX_URL"], token=os.environ["INFLUX_TOKEN"], org=ORG, timeout=30_000)
    for _ in range(60):
        try:
            if client.ping():
                break
        except Exception:
            pass
        time.sleep(2)
    write = client.write_api(write_options=SYNCHRONOUS)

    # Riwayat: tulis ulang 24 jam terakhir (idempoten: titik dengan waktu & tag sama ditimpa).
    batch: list[str] = []
    t = math.floor((S - DAY) / MIN) * MIN
    while t < S:
        batch += zone_points(t)
        if t >= S - 3 * HOUR and int(t) % (10 * MIN) == 0:
            for line in ("L1", "L2"):
                batch += profile_points(line, t - 300)
        if len(batch) > 5000:
            write.write(BUCKET, ORG, batch)
            batch = []
        t += MIN
    write.write(BUCKET, ORG, batch)
    print("riwayat 24 jam terisi", flush=True)

    last_run = math.floor(time.time() / (10 * MIN))
    while True:
        now = time.time()
        pts = zone_points(now)
        run = math.floor(now / (10 * MIN))
        if run != last_run:
            last_run = run
            for line in ("L1", "L2"):
                pts += profile_points(line, run * 10 * MIN - 300)
        try:
            write.write(BUCKET, ORG, pts)
        except Exception as e:  # jangan mati karena satu kegagalan jaringan
            print(f"gagal menulis: {e}", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()
