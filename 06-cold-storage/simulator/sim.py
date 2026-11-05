"""Simulator sensor gudang: publish MQTT (retained) setiap SIM_INTERVAL detik.

Saat start, kirim riwayat 24 jam ke topik riwayat/<ruang>/<metrik> (tidak retained) supaya grafik
langsung penuh. Skenario: pintu Cold storage B terbuka 7 menit setiap 20 menit (lewat batas 5 menit),
DC-05 dekat batas RH karena sering dibuka, DC-09 offline (tidak pernah mengirim).
"""
import json
import math
import os
import random
import time

import paho.mqtt.client as mqtt

RUANG = json.load(open(os.environ.get("RUANG_JSON", "/app/db/ruang.json"), encoding="utf-8"))["ruang"]
INTERVAL = float(os.environ.get("SIM_INTERVAL", "5"))
OFFLINE = {"dc-09"}


def pintu_terbuka(rid: str, t: float):
    """Kembalikan waktu mulai buka (detik) bila pintu sedang terbuka pada t, selain itu None."""
    if rid == "cs-b":
        siklus, lama, geser = 20 * 60, 7 * 60, 0
    elif rid in ("cs-a", "fz-01"):
        siklus, lama, geser = 30 * 60, 45, 400 if rid == "cs-a" else 900
    elif rid.startswith("dc-"):
        siklus, lama, geser = (6 * 60 if rid == "dc-05" else 25 * 60), 25, sum(map(ord, rid)) * 37 % 600
    else:
        return None
    fase = (t + geser) % siklus
    return t - fase if fase < lama else None


def nilai(cfg: dict, metrik: str, t: float) -> float:
    jam = time.localtime(t).tm_hour + time.localtime(t).tm_min / 60
    harian = math.cos((jam - 14) / 24 * 2 * math.pi)
    buka = pintu_terbuka(cfg["id"], t)
    menit_buka = (t - buka) / 60 if buka else 0
    if metrik == "suhu" and cfg["jenis"] in ("dingin", "beku"):
        return round(cfg["setpoint"] + 0.3 * harian + random.uniform(-0.15, 0.15) + 0.35 * menit_buka, 2)
    if metrik == "rh" and cfg["jenis"] == "lemari_kering":
        dasar = 4.4 if cfg["id"] == "dc-05" else 2.3
        return round(dasar + random.uniform(-0.15, 0.15) + 1.2 * min(menit_buka, 2), 2)
    if metrik == "suhu":
        return round(29 + 2.2 * harian + random.uniform(-0.3, 0.3), 1)
    return round(62 - 6 * harian + random.uniform(-1.5, 1.5), 1)


def publish_saat(c: mqtt.Client, t: float, awalan: str, retain: bool) -> None:
    ts = int(t * 1000)
    for cfg in RUANG:
        if cfg["id"] in OFFLINE:
            continue
        for m in cfg["metrik"]:
            c.publish(f"{awalan}/{cfg['id']}/{m}", json.dumps({"ts": ts, "v": nilai(cfg, m, t)}), qos=1, retain=retain)
        if awalan == "gudang" and "pintu" in cfg:
            buka = pintu_terbuka(cfg["id"], t)
            c.publish(f"gudang/{cfg['id']}/pintu", json.dumps({"ts": ts, "terbuka": buka is not None, "sejak": int((buka or t) * 1000)}), qos=1, retain=True)


def main() -> None:
    c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="simulator-gudang")
    c.username_pw_set(os.environ["MQTT_USER"], os.environ["MQTT_PASSWORD"])
    c.max_queued_messages_set(0)
    c.connect(os.environ.get("MQTT_HOST", "mosquitto"), 1883)
    c.loop_start()
    now = time.time()
    t = now - 24 * 3600
    n = 0
    while t < now:  # riwayat 24 jam, langkah 5 menit
        publish_saat(c, t, "riwayat", retain=False)
        t += 300
        n += 1
        if n % 24 == 0:
            time.sleep(0.2)  # beri waktu broker dan bridge
    print(f"riwayat 24 jam dikirim ({n} langkah)", flush=True)
    while True:
        publish_saat(c, time.time(), "gudang", retain=True)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
