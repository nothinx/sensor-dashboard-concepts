"""Uji cepat API tanpa Docker: python api/uji.py (dari folder proyek). Keluar 0 bila semua lulus."""
import json
import os
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tmp = tempfile.mkdtemp()
os.environ["DB_PATH"] = str(Path(tmp) / "uji.db")
os.environ["RIWAYAT_HARI"] = "2"
sys.path[:0] = [str(ROOT / "api"), str(ROOT / "simulator")]

import server  # noqa: E402
import simulator  # noqa: E402

conn = simulator.buka(os.environ["DB_PATH"])
n = simulator.isi_interval(conn, int(time.time()))
simulator.sesaat(conn, time.time())
assert n >= 2 * 96 - 1, n

srv = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}"


def get(path, headers=None):
    req = urllib.request.Request(base + path, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


s, h, b = get("/api/v1/dasbor")
d = json.loads(b)
assert s == 200 and h["ETag"], s
assert len(d["beban_24_jam"]) == 96, len(d["beban_24_jam"])
assert len(d["energi_per_jam"]) == 24 and len(d["panel"]) == 8
r = d["ringkasan"]
assert r["sisa_kapasitas_kw"] == round(r["batas_kontrak_kw"] - r["puncak_hari_ini"]["kw"], 1)
kmp = next(p for p in d["panel"] if p["id"] == "SDP-KMP")
assert "Faktor daya rendah" in kmp["masalah"] and "Arus tidak seimbang" in kmp["masalah"], kmp

s, _, b = get("/api/v1/dasbor", {"If-None-Match": h["ETag"]})
assert s == 304 and b == b"", s
assert get("/api/v1/beban?jam=0")[0] == 400
assert get("/api/v1/area?tanggal=05-11-2026")[0] == 400
assert get("/api/v1/tidak-ada")[0] == 404
assert get("/shared/../api/server.py")[0] == 404
assert get("/")[0] == 200
print("uji API 03: semua lulus")
srv.shutdown()
