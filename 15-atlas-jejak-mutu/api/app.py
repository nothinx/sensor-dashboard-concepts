"""API Jejak Mutu per Nomor Seri.

MongoDB Atlas (lokal: image mongodb-atlas-local; cloud: klaster Atlas) diakses lewat pymongo.
- Pencarian memakai Atlas Search ($search) pada koleksi `unit`.
- Riwayat uji disimpan di time series collection `uji`.
- Umpan kejadian diisi oleh change stream pada koleksi `unit` (time series tidak mendukung change stream).
Server HTTP pustaka standar menyajikan /api/* dan berkas dasbor (web/ + shared/).

Jalankan uji mandiri tanpa database: python app.py uji
"""
import json
import os
import re
import sys
import threading
from collections import deque
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

WIB = timezone(timedelta(hours=7))
STASIUN = ["PERAKITAN", "UJI-FUNGSI", "UJI-AKHIR", "KEMAS"]
SERIAL_RE = re.compile(r"^[A-Z0-9-]{4,24}$")
WEB = os.environ.get("WEB_DIR", os.path.join(os.path.dirname(__file__), "..", "web"))
SHARED = os.environ.get("SHARED_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "shared"))


def mongo_uri():
    # TARGET=emulator (default) memakai Atlas lokal; TARGET=cloud memakai klaster Atlas milik klien.
    if os.environ.get("TARGET", "emulator") == "cloud":
        return os.environ["MONGODB_URI_CLOUD"]
    return os.environ.get("MONGODB_URI_EMULATOR", "mongodb://localhost:27017/?directConnection=true")


def bersih_kueri(q):
    """Validasi kueri cari: 2 sampai 60 karakter, tanpa karakter kendali."""
    q = (q or "").strip()
    if not 2 <= len(q) <= 60 or any(ord(c) < 32 for c in q):
        raise ValueError("Kata kunci harus 2 sampai 60 karakter.")
    return q


def tahap_cari(q):
    """Pipeline $search: nomor seri (autocomplete) diberi bobot tertinggi, lalu catatan QC, kode cacat, model."""
    return [
        {"$search": {
            "index": "cari_unit",
            "compound": {"should": [
                {"autocomplete": {"query": q, "path": "serial", "score": {"boost": {"value": 5}}}},
                {"text": {"query": q, "path": ["catatan_qc.teks", "kode_cacat", "model"], "fuzzy": {"maxEdits": 1}}},
            ], "minimumShouldMatch": 1},
            "highlight": {"path": "catatan_qc.teks"},
        }},
        {"$limit": 8},
        {"$project": {"_id": 0, "serial": 1, "model": 1, "status": 1, "stasiun_terakhir": 1, "kode_cacat": 1,
                      "skor": {"$meta": "searchScore"}, "sorot": {"$meta": "searchHighlights"}}},
    ]


def ringkas_sorot(sorot):
    """Ambil potongan teks yang cocok dari searchHighlights (dipakai sebagai cuplikan hasil)."""
    for h in sorot or []:
        teks = "".join(t["value"] for t in h.get("texts", []))
        if teks:
            return teks[:140]
    return None


def perjalanan(unit, uji):
    """Gabungkan dokumen unit dan riwayat uji menjadi garis waktu per stasiun berurutan."""
    per = {s: [] for s in STASIUN}
    for u in uji:
        per.setdefault(u["meta"]["stasiun"], []).append(u)
    langkah = []
    for s in STASIUN:
        hasil = sorted(per.get(s, []), key=lambda u: u["waktu"])
        if not hasil:
            langkah.append({"stasiun": s, "status": "belum"})
            continue
        akhir = hasil[-1]
        langkah.append({
            "stasiun": s, "status": akhir["hasil"], "waktu": akhir["waktu"].isoformat(),
            "operator": akhir.get("operator"), "nilai": akhir.get("nilai", {}),
            "percobaan": [{"waktu": h["waktu"].isoformat(), "hasil": h["hasil"], "kode_cacat": h.get("kode_cacat"),
                           "catatan": h.get("catatan")} for h in hasil],
        })
    return {"serial": unit["serial"], "model": unit["model"], "lini": unit["lini"], "status": unit["status"],
            "dibuat_pada": unit["dibuat_pada"].isoformat(), "catatan_qc": unit.get("catatan_qc", []),
            "langkah": langkah}


class Aplikasi:
    def __init__(self):
        from pymongo import MongoClient
        self.db = MongoClient(mongo_uri(), tz_aware=True, tzinfo=WIB, serverSelectionTimeoutMS=5000)["jejak_mutu"]
        self.kejadian = deque(maxlen=30)
        threading.Thread(target=self.dengar, daemon=True).start()

    def dengar(self):
        # Change stream: setiap unit pindah stasiun atau ditahan menjadi satu baris umpan kejadian.
        # ponytail: umpan disimpan di memori proses; restart API mengosongkannya, lalu terisi lagi dari perubahan baru.
        for awal in self.db.unit.find({}, sort=[("diubah_pada", -1)], limit=15):
            self.kejadian.appendleft(self.baris(awal))
        pipa = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
        with self.db.unit.watch(pipa, full_document="updateLookup") as aliran:
            for ubah in aliran:
                if ubah.get("fullDocument"):
                    self.kejadian.appendleft(self.baris(ubah["fullDocument"]))

    @staticmethod
    def baris(u):
        return {"waktu": u["diubah_pada"].isoformat(), "serial": u["serial"], "model": u["model"],
                "stasiun": u["stasiun_terakhir"], "status": u["status"],
                "kode_cacat": (u.get("kode_cacat") or [None])[-1]}

    def cari(self, q):
        hasil = list(self.db.unit.aggregate(tahap_cari(bersih_kueri(q))))
        for h in hasil:
            h["cuplikan"] = ringkas_sorot(h.pop("sorot", None))
        return {"kueri": q, "hasil": hasil}

    def unit(self, serial):
        if not SERIAL_RE.match(serial):
            raise ValueError("Format nomor seri tidak dikenal.")
        u = self.db.unit.find_one({"serial": serial}, {"_id": 0})
        if not u:
            return None
        uji = list(self.db.uji.find({"meta.serial": serial}, {"_id": 0}).sort("waktu", 1))
        return perjalanan(u, uji)

    def cacat(self, hari):
        sejak = datetime.now(WIB) - timedelta(days=hari)
        pipa = [{"$match": {"waktu": {"$gte": sejak}, "hasil": "gagal"}},
                {"$group": {"_id": "$kode_cacat", "jumlah": {"$sum": 1}, "contoh": {"$first": "$catatan"}}},
                {"$sort": {"jumlah": -1}}, {"$limit": 6}]
        total = self.db.uji.count_documents({"waktu": {"$gte": sejak}})
        return {"hari": hari, "total_uji": total,
                "cacat": [{"kode": c["_id"], "jumlah": c["jumlah"], "contoh": c["contoh"]} for c in self.db.uji.aggregate(pipa)]}

    def ringkasan(self):
        hari_ini = datetime.now(WIB).replace(hour=0, minute=0, second=0, microsecond=0)
        uji = self.db.uji.aggregate([{"$match": {"waktu": {"$gte": hari_ini}}},
                                     {"$group": {"_id": "$hasil", "n": {"$sum": 1}}}])
        n = {u["_id"]: u["n"] for u in uji}
        return {"diperbarui": datetime.now(WIB).isoformat(),
                "ditahan": self.db.unit.count_documents({"status": "ditahan"}),
                "di_lini": self.db.unit.count_documents({"status": "di lini"}),
                "dikemas_hari_ini": self.db.unit.count_documents({"status": "dikemas", "diubah_pada": {"$gte": hari_ini}}),
                "uji_hari_ini": sum(n.values()), "gagal_hari_ini": n.get("gagal", 0),
                "sorotan": self.sorotan()}

    def sorotan(self):
        """Unit untuk pintasan di bawah kolom cari: yang ditahan dulu, lalu yang terakhir punya catatan cacat."""
        ditahan = [u["serial"] for u in self.db.unit.find({"status": "ditahan"}, {"serial": 1}).sort("diubah_pada", -1).limit(4)]
        cacat = [u["serial"] for u in self.db.unit.find({"status": {"$ne": "ditahan"}, "kode_cacat.0": {"$exists": True}},
                                                         {"serial": 1}).sort("diubah_pada", -1).limit(4 - len(ditahan))]
        return [{"serial": s, "ditahan": True} for s in ditahan] + [{"serial": s, "ditahan": False} for s in cacat]


APP = None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WEB, **kw)

    def translate_path(self, path):
        p = unquote(urlparse(path).path)
        if p.startswith("/shared/"):
            akar = os.path.realpath(SHARED)
            full = os.path.realpath(os.path.join(akar, p[len("/shared/"):]))
            return full if full.startswith(akar + os.sep) else os.path.join(akar, "__tidak_ada__")
        return super().translate_path(path)

    def kirim(self, kode, isi):
        data = json.dumps(isi, ensure_ascii=False, default=str).encode()
        self.send_response(kode)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        if not url.path.startswith("/api/"):
            return super().do_GET()
        q = parse_qs(url.query)
        try:
            if url.path == "/api/health":
                APP.db.command("ping")
                return self.kirim(200, {"status": "ok", "target": os.environ.get("TARGET", "emulator")})
            if url.path == "/api/cari":
                return self.kirim(200, APP.cari(q.get("q", [""])[0]))
            if url.path.startswith("/api/unit/"):
                u = APP.unit(url.path[len("/api/unit/"):].upper())
                return self.kirim(200, u) if u else self.kirim(404, {"galat": "Nomor seri tidak ditemukan."})
            if url.path == "/api/cacat":
                hari = int(q.get("hari", ["7"])[0])
                if not 1 <= hari <= 90:
                    raise ValueError("Parameter hari harus 1 sampai 90.")
                return self.kirim(200, APP.cacat(hari))
            if url.path == "/api/kejadian":
                return self.kirim(200, {"kejadian": list(APP.kejadian)})
            if url.path == "/api/ringkasan":
                return self.kirim(200, APP.ringkasan())
            return self.kirim(404, {"galat": "Rute tidak dikenal."})
        except ValueError as e:
            return self.kirim(400, {"galat": str(e)})
        except Exception as e:  # galat database: sebut sebab, jangan bocorkan URI
            return self.kirim(503, {"galat": f"Database tidak menjawab ({type(e).__name__})."})

    def log_message(self, format, *args):
        pass


def uji():
    assert bersih_kueri("  TV43 ") == "TV43"
    for salah in ["a", "x" * 61, "ab\x00"]:
        try:
            bersih_kueri(salah)
            raise AssertionError(salah)
        except ValueError:
            pass
    assert tahap_cari("garis")[0]["$search"]["index"] == "cari_unit"
    assert ringkas_sorot([{"texts": [{"value": "garis "}, {"value": "vertikal"}]}]) == "garis vertikal"
    t = datetime(2026, 11, 5, 9, tzinfo=WIB)
    unit = {"serial": "TV43-2611-000001", "model": "TV LED 43", "lini": "Lini TV 1", "status": "di lini", "dibuat_pada": t}
    ujis = [{"meta": {"serial": "x", "stasiun": "UJI-FUNGSI"}, "waktu": t + timedelta(minutes=30), "hasil": "gagal", "kode_cacat": "PNL-02"},
            {"meta": {"serial": "x", "stasiun": "UJI-FUNGSI"}, "waktu": t + timedelta(minutes=90), "hasil": "lulus"},
            {"meta": {"serial": "x", "stasiun": "PERAKITAN"}, "waktu": t, "hasil": "lulus"}]
    p = perjalanan(unit, ujis)
    assert [l["status"] for l in p["langkah"]] == ["lulus", "lulus", "belum", "belum"]
    assert len(p["langkah"][1]["percobaan"]) == 2
    assert SERIAL_RE.match("TV43-2611-000001") and not SERIAL_RE.match("../etc")
    print("uji lulus")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        APP = Aplikasi()
        port = int(os.environ.get("PORT", "8000"))
        print(f"API jejak mutu di :{port}, target {os.environ.get('TARGET', 'emulator')}", flush=True)
        ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
