"""Exporter Prometheus simulasi untuk NOC perangkat sensor (data contoh).

Mengekspos /metrics berisi status gateway dan sensor pabrik. Skenario dihitung relatif terhadap
"jangkar" (waktu start pertama, disimpan di ANCHOR_FILE) sehingga riwayat backfill dan data live
selalu konsisten walau container dinyalakan ulang.

  python exporter.py                       jalankan server :9100
  python exporter.py --backfill out.om     tulis riwayat 24 jam (OpenMetrics) untuk promtool
  python exporter.py --uji                 self-check skenario
"""
import os
import random
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LATEST_FW = "2.4.1"
STALE = 300  # detik tanpa data = offline (sama dengan aturan alert)
# id, area, protokol, jumlah sensor, uptime saat jangkar (detik), kode tag
GATEWAYS = [
    ("GW-L1", "SMT Line 1", "Modbus RTU", 64, 41 * 86400, "L1"),
    ("GW-L2", "SMT Line 2", "Modbus RTU", 71, 11 * 3600, "L2"),
    ("GW-PR", "Perakitan TV & kulkas", "Modbus RTU", 88, 41 * 86400, "PR"),
    ("GW-UT", "Kompresor & utilitas", "Modbus TCP", 52, 41 * 86400, "UT"),
    ("GW-GD", "Gudang", "Modbus TCP", 17, 0, "GD"),
    ("LoRa", "Nirkabel seluruh pabrik", "LoRaWAN", 126, 41 * 86400, "LR"),
]
GD_DOWN = 8 * 3600 + 20 * 60  # GW-GD putus jaringan 8 jam 20 menit sebelum jangkar
JENIS = {
    "TH": "Suhu & kelembapan", "TC": "Termokopel", "VB": "Getaran", "PM": "Power meter",
    "DS": "Sensor pintu", "PC": "Partikel", "DC": "Dry cabinet RH",
}
JENIS_GW = {
    "L1": ["TC", "TH", "PC", "TC", "PM"], "L2": ["TC", "TH", "PC", "TC", "PM"],
    "PR": ["TH", "VB", "PM", "TH"], "UT": ["VB", "PM", "TH"], "GD": ["TH", "DC", "DS", "TH"],
    "LR": ["TH", "TH", "DS", "TH"],
}
LOKASI_LORA = ["Perakitan kulkas", "Perakitan TV", "Uji akhir (QC)", "Gudang umum", "Kantor produksi", "Cold storage"]
BATERAI_RENDAH = {"TH-PK-14": 3, "TH-PK-09": 8, "DS-CSB-01": 11, "TH-QC-02": 13, "TH-PK-03": 14,
                  "TH-TV-12": 16, "TH-GD-01": 17, "DS-GD-04": 18, "TH-TV-05": 19}
FW_LAMA = {"TH-TV-05": "2.3.8", "TH-QC-02": "2.3.8", "DS-GD-04": "2.3.8", "TH-PK-21": "2.3.8", "VB-UT-07": "2.4.0"}


def esc(v):
    return str(v).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def bangun_sensor(anchor):
    """Daftar sensor deterministik + skenario gangguan."""
    out = []
    for gw, area, proto, n, _, kode in GATEWAYS:
        if kode == "LR":
            # sensor nirkabel dinamai menurut lokasi; nama khusus dari skenario lebih dulu
            nama = list(BATERAI_RENDAH) + ["TH-PK-21"]
            r = random.Random(7)
            while len(nama) < n:
                cand = f"{r.choice(['TH-PK', 'TH-TV', 'TH-QC', 'TH-GU', 'DS-GU', 'TH-KP'])}-{r.randint(1, 60):02d}"
                if cand not in nama:
                    nama.append(cand)
        elif kode == "GD":
            nama = ["TH-GD-08", "TH-GD-11", "DC-09", "DS-GD-02"] + [f"{t}-GD-{i:02d}" for i, t in
                                                                     zip(range(12, 25), ["TH", "DC", "DS", "TH"] * 4)]
        else:
            tipe = JENIS_GW[kode]
            nama = [f"{tipe[i % len(tipe)]}-{kode}-{i + 1:02d}" for i in range(n)]
            if kode == "PR":
                nama[5] = "VB-CV-TV"
        for i, sid in enumerate(nama[:n]):
            r = random.Random(sid)
            t = sid.split("-")[0]
            lora = kode == "LR"
            s = {
                "id": sid, "gw": gw, "jenis": JENIS.get(t, "Sensor"), "lora": lora,
                "lokasi": (r.choice(LOKASI_LORA) if lora else area) + f", titik {i + 1}",
                "fw": FW_LAMA.get(sid, LATEST_FW), "fase": r.random(),
                "baterai": BATERAI_RENDAH.get(sid, round(r.uniform(24, 100), 1)) if lora else None,
                "rssi": round(r.uniform(-112, -72), 1) if lora else None,
                "crc_dasar": r.randint(0, 3) if not lora else 0,
                "offline_sejak": None, "crc_naik": False,
            }
            if gw == "GW-GD":
                s["offline_sejak"] = anchor - GD_DOWN + r.uniform(0, 4)
            if sid == "VB-CV-TV":
                s["offline_sejak"], s["crc_naik"] = anchor - 2 * 3600, True
            if sid == "TH-PK-14":
                s["offline_sejak"] = anchor - 45 * 60
            out.append(s)
    return out


def last_seen(s, now):
    if s["offline_sejak"] is not None and now >= s["offline_sejak"]:
        return s["offline_sejak"]
    interval = 60 if s["lora"] else 5
    return now - ((now - s["fase"] * interval) % interval)


def metrics(sensors, anchor, now):
    by_gw = {g[0]: [s for s in sensors if s["gw"] == g[0]] for g in GATEWAYS}
    L = []

    def fam(name, typ, help_):
        L.append(f"# HELP {name} {help_}")
        L.append(f"# TYPE {name} {typ}")

    fam("noc_gateway_info", "gauge", "Identitas gateway (nilai selalu 1)")
    for gw, area, proto, *_ in GATEWAYS:
        L.append(f'noc_gateway_info{{gateway="{gw}",area="{esc(area)}",protocol="{proto}"}} 1')
    fam("noc_gateway_up", "gauge", "1 bila gateway terhubung ke kolektor")
    for gw, *_ in GATEWAYS:
        L.append(f'noc_gateway_up{{gateway="{gw}"}} {0 if gw == "GW-GD" else 1}')
    fam("noc_gateway_uptime_seconds", "gauge", "Lama gateway menyala sejak restart terakhir")
    for gw, _, _, _, up0, _ in GATEWAYS:
        L.append(f'noc_gateway_uptime_seconds{{gateway="{gw}"}} {0 if gw == "GW-GD" else round(up0 + now - anchor)}')
    fam("noc_gateway_sensors_online", "gauge", f"Jumlah sensor yang mengirim data dalam {STALE} detik terakhir")
    for gw, items in by_gw.items():
        L.append(f'noc_gateway_sensors_online{{gateway="{gw}"}} {sum(now - last_seen(s, now) < STALE for s in items)}')
    fam("noc_sensor_info", "gauge", "Identitas sensor (nilai selalu 1)")
    for s in sensors:
        L.append(f'noc_sensor_info{{sensor="{s["id"]}",gateway="{s["gw"]}",type="{esc(s["jenis"])}",'
                 f'location="{esc(s["lokasi"])}",firmware="{s["fw"]}"}} 1')
    fam("noc_sensor_last_seen_timestamp_seconds", "gauge", "Waktu Unix data terakhir diterima dari sensor")
    for s in sensors:
        L.append(f'noc_sensor_last_seen_timestamp_seconds{{sensor="{s["id"]}",gateway="{s["gw"]}"}} {last_seen(s, now):.1f}')
    fam("noc_sensor_battery_percent", "gauge", "Sisa baterai sensor nirkabel")
    for s in sensors:
        if s["lora"]:
            b = max(0.0, s["baterai"] - (now - anchor) / 86400 * 0.05)  # ponytail: pengurasan linear, ganti model nyata bila ada data
            L.append(f'noc_sensor_battery_percent{{sensor="{s["id"]}",gateway="{s["gw"]}"}} {b:.1f}')
    fam("noc_sensor_rssi_dbm", "gauge", "Kuat sinyal LoRa paket terakhir")
    for s in sensors:
        if s["lora"]:
            j = random.Random(f'{s["id"]}{int(now // 60)}').uniform(-2, 2)
            L.append(f'noc_sensor_rssi_dbm{{sensor="{s["id"]}",gateway="{s["gw"]}"}} {s["rssi"] + j:.1f}')
    fam("noc_sensor_crc_errors_total", "counter", "Jumlah frame Modbus dengan galat CRC atau timeout")
    for s in sensors:
        if not s["lora"]:
            v = s["crc_dasar"] + (int((now - s["offline_sejak"]) * 0.2) if s["crc_naik"] and now > s["offline_sejak"] else 0)
            L.append(f'noc_sensor_crc_errors_total{{sensor="{s["id"]}",gateway="{s["gw"]}"}} {v}')
    fam("noc_firmware_latest_info", "gauge", "Versi firmware sensor terbaru yang dirilis")
    L.append(f'noc_firmware_latest_info{{version="{LATEST_FW}"}} 1')
    return "\n".join(L) + "\n"


def online_historis(gw, n, t, anchor, r):
    """Jumlah sensor online per gateway pada waktu t (sebelum jangkar), sesuai skenario."""
    if gw == "GW-GD":
        return n if t < anchor - GD_DOWN else 0
    if gw == "GW-L2" and anchor - 11 * 3600 - 600 <= t < anchor - 11 * 3600:
        return 0  # restart gateway
    if gw == "GW-PR":
        return n if t < anchor - 2 * 3600 else n - 1
    if gw == "LoRa":
        base = n if t < anchor - 45 * 60 else n - 1
        return base - (1 if r.random() < 0.08 else 0)  # paket LoRa hilang sesekali
    return n


def backfill(path, anchor):
    r = random.Random(1)
    lines = ["# HELP noc_gateway_sensors_online Jumlah sensor yang mengirim data",
             "# TYPE noc_gateway_sensors_online gauge"]
    start = int(anchor - 24 * 3600)
    for gw, _, _, n, _, _ in GATEWAYS:
        for t in range(start, int(anchor) - 60, 60):
            lines.append(f'noc_gateway_sensors_online{{gateway="{gw}",instance="exporter:9100",job="noc-exporter"}} '
                         f'{online_historis(gw, n, t, anchor, r)} {t}')
    lines.append("# EOF")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


def anchor_now():
    p = os.environ.get("ANCHOR_FILE", "/bf/anchor")
    try:
        with open(p) as f:
            return float(f.read().strip())
    except OSError:
        return time.time()


def uji():
    a = 1_800_000_000.0
    s = bangun_sensor(a)
    assert len(s) == sum(g[3] for g in GATEWAYS) == 418, len(s)
    assert len({x["id"] for x in s}) == 418, "ID sensor ganda"
    m = metrics(s, a, a + 10)
    assert 'noc_gateway_sensors_online{gateway="GW-GD"} 0' in m
    assert 'noc_gateway_sensors_online{gateway="GW-PR"} 87' in m
    assert 'noc_gateway_sensors_online{gateway="LoRa"} 125' in m
    assert online_historis("GW-GD", 17, a - 9 * 3600, a, random.Random(1)) == 17
    print("uji ok")


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_error(404)
            return
        body = metrics(SENSORS, ANCHOR, time.time()).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    elif "--backfill" in sys.argv:
        anchor_path = os.environ.get("ANCHOR_FILE", "/bf/anchor")
        if os.path.exists(anchor_path):
            print("jangkar sudah ada, backfill dilewati")
            sys.exit(0)
        a = time.time()
        backfill(sys.argv[sys.argv.index("--backfill") + 1], a)
        with open(anchor_path, "w") as f:
            f.write(f"{a:.3f}")
        print("backfill 24 jam ditulis")
    else:
        ANCHOR = anchor_now()
        SENSORS = bangun_sensor(ANCHOR)
        print(f"exporter :9100, {len(SENSORS)} sensor")
        ThreadingHTTPServer(("0.0.0.0", 9100), H).serve_forever()
