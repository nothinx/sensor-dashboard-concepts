"""Uji cepat skema GraphQL dengan data simulator di folder sementara.
Jalankan di container: docker compose -p konsep-04 run --rm api python api/uji.py
"""
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["RIWAYAT_HARI"] = "30"
sys.path[:0] = [str(ROOT / "api"), str(ROOT / "simulator")]

import duckdb  # noqa: E402
import simulator  # noqa: E402

con = duckdb.connect()
now = datetime.now(timezone.utc)
model = simulator.Model(now)
mesin = simulator.muat_mesin()
simulator.contoh_perintah_kerja(con)
for k in (29, 1, 0):
    simulator.tulis_hari(con, mesin, model, (now - timedelta(days=k)).date(), now)

import app  # noqa: E402

assert app.zona(1.0, "II") == "A" and app.zona(2.0, "II") == "B" and app.zona(5.3, "II") == "C" and app.zona(7.2, "II") == "D"
assert app.zona(1.6, "I") == "B" and app.zona(4.6, "I") == "D"

r = app.schema.execute_sync("""{ daftarMesin { id status zona rmsTerkiniMmS }
  mesin(id: "K-02") { zona status tren(hari: 30) { tanggal rmsMmS } spektrum { bpfoHz frekuensiPutarHz resolusiHz amplitudoMmS }
  perintahKerja { id } } ringkasan { jumlahMesin perluTindakan offline } }""")
assert r.errors is None, r.errors
d = r.data
assert d["daftarMesin"][0]["id"] == "K-02", d["daftarMesin"][0]
assert next(m for m in d["daftarMesin"] if m["id"] == "CV-TV")["status"] == "OFFLINE"
k02 = d["mesin"]
assert k02["zona"] == "C" and k02["status"] == "PERINGATAN", k02
s = k02["spektrum"]
puncak = max(range(len(s["amplitudoMmS"])), key=lambda i: s["amplitudoMmS"][i])
assert abs(puncak * s["resolusiHz"] - s["bpfoHz"]) <= s["resolusiHz"], (puncak, s["bpfoHz"])
assert d["ringkasan"] == {"jumlahMesin": 7, "perluTindakan": 1, "offline": 1}, d["ringkasan"]

m = app.schema.execute_sync('mutation { buatPerintahKerja(input: {mesinId: "K-02", judul: "  Periksa   bearing ", prioritas: TINGGI}) { id judul status } }')
assert m.errors is None and m.data["buatPerintahKerja"]["judul"] == "Periksa bearing", m
assert len(app.schema.execute_sync('{ mesin(id: "K-02") { perintahKerja { id } } }').data["mesin"]["perintahKerja"]) == 1
bad = app.schema.execute_sync('mutation { buatPerintahKerja(input: {mesinId: "X-99", judul: "Uji"}) { id } }')
assert bad.errors and "tidak terdaftar" in bad.errors[0].message
assert app.schema.execute_sync('{ mesin(id: "K-02") { tren(hari: 0) { tanggal } } }').errors
print("uji GraphQL 04: semua lulus")
