"""Gudang & Cold Storage: bridge MQTT → Redis dan REST API kecil (riwayat dari Redis Streams).

Satu kode, dua peran:
  python app.py bridge   berlangganan MQTT, menulis nilai terkini (hash) dan riwayat (stream) ke Redis
  python app.py api      HTTP: /api/health, /api/ruang, /api/riwayat, plus dasbor statis
"""
import json
import os
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import redis

CONFIG = json.load(open(os.environ.get("RUANG_JSON", "/app/db/ruang.json"), encoding="utf-8"))["ruang"]
RUANG = {r["id"]: r for r in CONFIG}
RETENSI_MS = 7 * 24 * 3600 * 1000  # riwayat disimpan 7 hari (XADD MINID)
HIDUP_DETIK = 120                    # kunci hidup:<ruang> kedaluwarsa = sensor offline
WEB = os.environ.get("WEB_DIR", "/app/web")
SHARED = os.environ.get("SHARED_DIR", "/app/shared")

r = redis.Redis(host=os.environ.get("REDIS_HOST", "redis"), port=6379,
                password=os.environ.get("REDIS_PASSWORD") or None, decode_responses=True)


# ---------------------------------------------------------------- bridge
def simpan(topic: str, data: dict) -> None:
    """Petakan satu pesan MQTT ke struktur Redis. Topik: gudang|riwayat/<ruang>/<metrik>."""
    asal, ruang, metrik = topic.split("/")
    if ruang not in RUANG:
        return
    ts = int(data["ts"])
    if metrik == "pintu":
        r.hset(f"terkini:{ruang}", mapping={"pintu_terbuka": int(bool(data["terbuka"])), "pintu_sejak": int(data["sejak"]), "pintu_ts": ts})
        return
    if metrik not in RUANG[ruang]["metrik"]:
        return
    v = float(data["v"])
    try:
        r.xadd(f"riwayat:{ruang}:{metrik}", {"v": v}, id=f"{ts}-*", minid=ts - RETENSI_MS, approximate=True)
    except redis.ResponseError:
        pass  # ID lebih tua dari entri terakhir (backfill ulang setelah restart): abaikan, data sudah ada
    if asal == "gudang":
        p = r.pipeline()
        p.hset(f"terkini:{ruang}", mapping={metrik: v, f"{metrik}_ts": ts})
        p.set(f"hidup:{ruang}", ts, ex=HIDUP_DETIK)
        p.execute()


def bridge() -> None:
    import paho.mqtt.client as mqtt

    def on_connect(c, _u, _f, rc, _p):
        print(f"bridge tersambung ke broker (rc={rc})", flush=True)
        c.subscribe([("gudang/#", 1), ("riwayat/#", 1)])

    def on_message(_c, _u, msg):
        try:
            simpan(msg.topic, json.loads(msg.payload))
        except (ValueError, KeyError) as e:
            print(f"pesan diabaikan {msg.topic}: {e}", flush=True)

    c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="bridge-redis")
    c.on_connect, c.on_message = on_connect, on_message
    c.connect(os.environ.get("MQTT_HOST", "mosquitto"), 1883)
    c.loop_forever(retry_first_connection=True)


# ---------------------------------------------------------------- api
def rata_per_langkah(entri, langkah_ms):
    """[(ts_ms, v)] → [{ts, v}] rata-rata per ember waktu."""
    ember = {}
    for ts, v in entri:
        b = ts - ts % langkah_ms
        s = ember.setdefault(b, [0.0, 0])
        s[0] += v
        s[1] += 1
    return [{"ts": b, "v": round(s / n, 2)} for b, (s, n) in sorted(ember.items())]


def ruang_terkini():
    p = r.pipeline()
    for rid in RUANG:
        p.hgetall(f"terkini:{rid}")
    hasil = []
    for cfg, t in zip(CONFIG, p.execute()):
        nilai = {m: float(t[m]) for m in cfg["metrik"] if m in t}
        ts = {m: int(t[f"{m}_ts"]) for m in cfg["metrik"] if f"{m}_ts" in t}
        pintu = {"terbuka": t["pintu_terbuka"] == "1", "sejak": int(t["pintu_sejak"])} if "pintu_terbuka" in t else None
        hasil.append({**cfg, "nilai": nilai, "ts": ts, "pintu_status": pintu})
    return hasil


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # /shared/* dari pustaka bersama, sisanya dari web/; super() menetralkan ".." dan karakter aneh
        root, p = (SHARED, path[len("/shared"):]) if path.startswith("/shared/") else (WEB, path)
        self.directory = root
        return super().translate_path(p)

    def log_message(self, *_):
        pass

    def kirim(self, kode, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(kode)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", os.environ.get("CORS_ORIGIN", "http://localhost:18060"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return super().do_GET()
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/api/health":
                r.ping()
                return self.kirim(200, {"status": "ok"})
            if u.path == "/api/ruang":
                return self.kirim(200, {"ts": int(time.time() * 1000), "ruang": ruang_terkini()})
            if u.path == "/api/riwayat":
                rid, metrik = q.get("ruang", ""), q.get("metrik", "")
                if rid not in RUANG:
                    return self.kirim(400, {"galat": f"Ruang '{rid}' tidak dikenal; lihat daftar di /api/ruang"})
                if metrik not in RUANG[rid]["metrik"]:
                    return self.kirim(400, {"galat": f"Metrik '{metrik}' tidak ada untuk ruang {rid}"})
                jam, langkah = int(q.get("jam", 24)), int(q.get("langkah", 15))
                if not 1 <= jam <= 168 or langkah not in (1, 5, 15, 60):
                    return self.kirim(400, {"galat": "jam harus 1 sampai 168; langkah harus 1, 5, 15, atau 60 menit"})
                awal = int(time.time() * 1000) - jam * 3600 * 1000
                entri = [(int(i.split("-")[0]), float(f["v"])) for i, f in r.xrange(f"riwayat:{rid}:{metrik}", min=awal)]
                return self.kirim(200, {"ruang": rid, "metrik": metrik, "langkah_menit": langkah,
                                        "deret": rata_per_langkah(entri, langkah * 60000)})
            return self.kirim(404, {"galat": "Endpoint tidak ada"})
        except ValueError:
            return self.kirim(400, {"galat": "jam dan langkah harus bilangan bulat"})
        except redis.RedisError as e:
            return self.kirim(503, {"galat": f"Redis tidak dapat dihubungi ({e.__class__.__name__}); periksa layanan redis"})


def api():
    port = int(os.environ.get("PORT", "8080"))
    print(f"API gudang di port {port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    peran = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if peran == "bridge":
        bridge()
    elif peran == "api":
        api()
    else:  # uji mandiri logika murni: python app.py uji
        assert rata_per_langkah([(0, 1.0), (60000, 3.0), (900000, 5.0)], 900000) == [{"ts": 0, "v": 2.0}, {"ts": 900000, "v": 5.0}]
        assert rata_per_langkah([], 60000) == []
        print("app.py: uji lulus")
