"""Simulator stasiun uji akhir dua lini kulkas.

Meniru pesan perangkat ke Azure IoT Hub (amplop deviceId/messageId/enqueuedTime + body) yang di cloud
dirutekan ke container Cosmos DB `pengujian`. Di lokal, pesan ditulis langsung ke emulator.
Saat container kosong, riwayat 24 jam diisi dulu (backfill) supaya dasbor langsung penuh.
"""
import math
import os
import random
import sys
import time
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common.aturan import BATAS, nilai_uji  # noqa: E402
from common.cosmos import siapkan  # noqa: E402

LINI = {"L1": {"model": "KLK-2P-260", "gagal": 0.05}, "L2": {"model": "KLK-1P-180", "gagal": 0.08}}
INTERVAL_S = int(os.environ.get("SIM_INTERVAL_S", "30"))
TAKT_BACKFILL_S = 120  # satu unit per lini tiap 2 menit pada riwayat


def kurva_vakum(r: random.Random, bocor_vakum: bool) -> tuple[list[list[float]], float | None]:
    """Tekanan (Pa) tiap 12 detik selama 300 detik; turun eksponensial ke tekanan dasar."""
    tau = r.uniform(25, 31) * (1.45 if bocor_vakum and r.random() < 0.5 else 1)
    dasar = r.uniform(180, 320) if bocor_vakum and tau < 35 else r.uniform(25, 60)
    titik, capai = [], None
    for t in range(0, 301, 12):
        p = 101325 * math.exp(-t / tau) + dasar
        titik.append([t, round(p, 1)])
    for t in range(0, 301):  # waktu tepat tekanan menyentuh target
        if 101325 * math.exp(-t / tau) + dasar <= BATAS["vakum_target_pa"]:
            capai = t
            break
    return titik, capai


def buat_uji(lini: str, seq: int, waktu: datetime, percobaan: int, gangguan: float) -> dict:
    r = random.Random(zlib.crc32(f"{lini}-{seq}-{percobaan}".encode()))
    p_gagal = LINI[lini]["gagal"] * (0.35 if percobaan > 1 else 1)
    jenis_gagal = r.choices(["vakum", "bocor", "dingin", "arus"], weights=[3 + gangguan * 20, 3, 2, 1])[0] \
        if r.random() < p_gagal + gangguan else None
    kurva, capai = kurva_vakum(r, jenis_gagal == "vakum")
    unit = f"{LINI[lini]['model']}-{lini}-{waktu:%y%m%d}-{seq:04d}"
    body = {
        "unit": unit, "lini": lini, "model": LINI[lini]["model"], "percobaan": percobaan,
        "vakum": {"kurva": kurva, "waktu_capai_s": capai, "akhir_pa": kurva[-1][1]},
        "bocor_g_tahun": round(r.uniform(3.4, 6.5) if jenis_gagal == "bocor" else r.uniform(0.2, 1.6), 2),
        "evap_c": round(r.uniform(-10.5, -7.0) if jenis_gagal == "dingin" else r.uniform(-17.5, -13.2), 1),
        "arus_a": round(r.choice([r.uniform(1.45, 1.7), r.uniform(0.4, 0.55)]) if jenis_gagal == "arus" else r.uniform(0.82, 1.15), 2),
    }
    alasan = nilai_uji(body)
    waktu_iso = waktu.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return {
        "id": f"{unit}-P{percobaan}", **body, "hasil": "gagal" if alasan else "lulus", "alasan": alasan,
        "waktu": waktu_iso,
        # metadata pesan IoT Hub (di cloud diisi oleh IoT Hub)
        "iothub": {"deviceId": f"stasiun-uji-{lini}", "messageId": f"{lini}-{seq}-{percobaan}", "enqueuedTime": waktu_iso},
    }


def gangguan_l2(waktu: datetime, sekarang: datetime) -> float:
    """Pompa vakum Line 2 bermasalah sejak 90 menit sebelum simulator start (cerita demo)."""
    return 0.18 if sekarang - waktu <= timedelta(minutes=90) else 0.0


def jalan():
    c = siapkan()["pengujian"]
    sekarang = datetime.now(timezone.utc)
    seq = {"L1": 0, "L2": 0}
    ulang: list[tuple[datetime, str, int]] = []  # (jadwal, lini, seq) unit gagal percobaan 1

    def kirim(lini, s, waktu, percobaan):
        g = gangguan_l2(waktu, sekarang) if lini == "L2" and percobaan == 1 else 0.0
        d = buat_uji(lini, s, waktu, percobaan, g)
        c.upsert_item(d)
        if d["hasil"] == "gagal" and percobaan == 1:
            ulang.append((waktu + timedelta(minutes=random.Random(s).randint(25, 70)), lini, s))
        return d

    ada = list(c.query_items("SELECT VALUE COUNT(1) FROM c", enable_cross_partition_query=True))
    if not ada or ada[0] == 0:
        print("mengisi riwayat 24 jam", flush=True)
        t = sekarang - timedelta(hours=24)
        while t < sekarang:
            for lini in LINI:
                seq[lini] += 1
                kirim(lini, seq[lini], t + timedelta(seconds=40 if lini == "L2" else 0), 1)
            for item in [u for u in ulang if u[0] <= t]:
                ulang.remove(item)
                kirim(item[1], item[2], item[0], 2)
            t += timedelta(seconds=TAKT_BACKFILL_S)
        print(f"riwayat selesai: {sum(seq.values())} unit", flush=True)
    else:
        # lanjutkan nomor urut dari data yang ada
        for lini in LINI:
            n = list(c.query_items("SELECT VALUE COUNT(1) FROM c WHERE c.lini = @l AND c.percobaan = 1",
                                   parameters=[{"name": "@l", "value": lini}], partition_key=lini))
            seq[lini] = n[0] if n else 0

    giliran = 0
    while True:
        time.sleep(INTERVAL_S)
        sekarang_ = datetime.now(timezone.utc)
        lini = list(LINI)[giliran % 2]
        giliran += 1
        seq[lini] += 1
        d = kirim(lini, seq[lini], sekarang_, 1)
        for item in [u for u in ulang if u[0] <= sekarang_]:
            ulang.remove(item)
            kirim(item[1], item[2], sekarang_, 2)
        print(f"{d['unit']} {d['hasil']}", flush=True)


if __name__ == "__main__":
    jalan()
