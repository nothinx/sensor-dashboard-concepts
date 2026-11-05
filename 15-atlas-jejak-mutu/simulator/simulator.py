"""Simulator lini produksi: unit TV dan kulkas berjalan melewati 4 stasiun, menulis ke MongoDB Atlas.

- Saat start pertama: buat koleksi, time series `uji`, indeks Atlas Search `cari_unit`, lalu isi riwayat 7 hari.
- Setelah itu tiap TICK_DETIK: unit baru masuk lini dan unit yang ada maju satu stasiun.
Semua data adalah contoh. Daftar model, kode cacat, dan catatan QC asli: [REAL DATA: dari sistem QC klien].
"""
import os
import random
import time
from datetime import datetime, timedelta, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import OperationFailure

WIB = timezone(timedelta(hours=7))
STASIUN = ["PERAKITAN", "UJI-FUNGSI", "UJI-AKHIR", "KEMAS"]
MODEL = [("TV43", "TV LED 43 inci", "Lini TV 1"), ("TV50", "TV LED 50 inci", "Lini TV 2"),
         ("TV32", "TV LED 32 inci", "Lini TV 1"), ("KL2P", "Kulkas 2 pintu", "Lini kulkas")]
# kode cacat contoh per jenis produk dan stasiun tempat biasanya terdeteksi
CACAT = {
    "TV": [("PNL-02", "UJI-FUNGSI", "Garis vertikal tipis pada panel saat uji pola warna merah"),
           ("AUD-01", "UJI-FUNGSI", "Suara speaker kiri pecah pada volume di atas 80"),
           ("IR-01", "UJI-AKHIR", "Sensor remote tidak merespons dari jarak 5 meter"),
           ("KSM-02", "UJI-AKHIR", "Goresan halus di bezel bawah, panjang sekitar 1 cm"),
           ("PWR-03", "UJI-FUNGSI", "Unit mati sendiri setelah 20 menit uji panas")],
    "KL": [("SEG-01", "UJI-AKHIR", "Karet pintu tidak rapat, celah 2 mm di sisi engsel"),
           ("KMP-03", "UJI-FUNGSI", "Kompresor berdengung keras saat start pertama"),
           ("REF-02", "UJI-FUNGSI", "Suhu freezer belum turun ke -15 °C setelah 90 menit"),
           ("KSM-02", "UJI-AKHIR", "Penyok kecil di panel samping kanan")],
}
OPERATOR = ["OP-011", "OP-014", "OP-020", "OP-023", "OP-031"]
R = random.Random(15)


def uri():
    if os.environ.get("TARGET", "emulator") == "cloud":
        return os.environ["MONGODB_URI_CLOUD"]
    return os.environ.get("MONGODB_URI_EMULATOR", "mongodb://localhost:27017/?directConnection=true")


def siapkan(db):
    ada = db.list_collection_names()
    if "uji" not in ada:
        db.create_collection("uji", timeseries={"timeField": "waktu", "metaField": "meta", "granularity": "minutes"})
        db.uji.create_index([("meta.serial", ASCENDING), ("waktu", ASCENDING)])
    if "unit" not in ada:
        db.create_collection("unit")
        db.unit.create_index("serial", unique=True)
        db.unit.create_index([("diubah_pada", DESCENDING)])
        db.unit.create_index("status")
    # nomor seri: autocomplete atas string utuh (lucene.keyword) agar "TV43-2611-00" cocok sebagai awalan, bukan per token
    definisi = {"mappings": {"dynamic": False, "fields": {
        "serial": [{"type": "string", "analyzer": "lucene.keyword"},
                   {"type": "autocomplete", "analyzer": "lucene.keyword", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 20}],
        "model": {"type": "string"},
        "kode_cacat": {"type": "string", "analyzer": "lucene.keyword"},
        "catatan_qc": {"type": "document", "fields": {"teks": {"type": "string", "analyzer": "lucene.standard"}}},
    }}}
    if any(i["name"] == "cari_unit" for i in db.unit.list_search_indexes()):
        db.unit.update_search_index("cari_unit", definisi)
    else:
        db.unit.create_search_index({"name": "cari_unit", "definition": definisi})


def nilai_uji(kode, stasiun):
    """Besaran terukur per stasiun (contoh) untuk ditampilkan di garis waktu."""
    if stasiun == "UJI-FUNGSI":
        return {"daya_w": round(R.uniform(48, 95), 1)} if kode.startswith("TV") else {"arus_kompresor_a": round(R.uniform(0.9, 1.4), 2)}
    if stasiun == "UJI-AKHIR":
        return {"hipot_ma": round(R.uniform(0.2, 0.9), 2)}
    return {}


class Lini:
    def __init__(self, db):
        self.db = db
        self.urut = db.unit.count_documents({})

    def unit_baru(self, t):
        kode, model, lini = R.choices(MODEL, weights=[4, 2, 3, 3])[0]
        self.urut += 1
        serial = f"{kode}-{t:%y%m}-{self.urut:06d}"
        u = {"serial": serial, "model": model, "lini": lini, "status": "di lini", "stasiun_terakhir": "PERAKITAN",
             "dibuat_pada": t, "diubah_pada": t, "catatan_qc": [], "kode_cacat": [], "langkah": 0}
        self.db.unit.insert_one(u)
        self.uji(u, "PERAKITAN", t)
        return u

    def uji(self, u, stasiun, t):
        jenis = "TV" if u["serial"].startswith("TV") else "KL"
        kandidat = [c for c in CACAT[jenis] if c[1] == stasiun]
        gagal = kandidat and R.random() < 0.08
        doc = {"waktu": t, "meta": {"serial": u["serial"], "stasiun": stasiun}, "hasil": "gagal" if gagal else "lulus",
               "operator": R.choice(OPERATOR), "nilai": nilai_uji(u["serial"], stasiun)}
        ubah = {"stasiun_terakhir": stasiun, "diubah_pada": t}
        push = {}
        if gagal:
            kode, _, catatan = R.choice(kandidat)
            doc.update(kode_cacat=kode, catatan=catatan)
            ubah["status"] = "ditahan"
            push = {"catatan_qc": {"waktu": t, "stasiun": stasiun, "teks": catatan}, "kode_cacat": kode}
        else:
            ubah["status"] = "dikemas" if stasiun == "KEMAS" else "di lini"
            ubah["langkah"] = STASIUN.index(stasiun)
        self.db.uji.insert_one(doc)
        self.db.unit.update_one({"serial": u["serial"]}, {"$set": ubah, **({"$push": push} if push else {})})

    def maju(self, u, t):
        """Unit lulus maju ke stasiun berikut; unit ditahan diulang di stasiun yang sama (setelah perbaikan)."""
        if u["status"] == "ditahan":
            self.uji(u, u["stasiun_terakhir"], t)
        elif u["langkah"] < len(STASIUN) - 1:
            self.uji(u, STASIUN[u["langkah"] + 1], t)


def backfill(db, lini):
    if db.unit.estimated_document_count():
        return
    mulai = datetime.now(WIB) - timedelta(days=7)
    t = mulai
    while t < datetime.now(WIB) - timedelta(minutes=10):
        # jam kerja 07.00 sampai 22.00: unit masuk tiap 6 sampai 14 menit
        if 7 <= t.hour < 22:
            u = lini.unit_baru(t)
            dt = t
            for _ in range(len(STASIUN) - 1 + 2):
                dt += timedelta(minutes=R.randint(25, 70))
                if dt > datetime.now(WIB):
                    break
                cur = db.unit.find_one({"serial": u["serial"]})
                if cur["status"] == "dikemas":
                    break
                lini.maju(cur, dt)
        t += timedelta(minutes=R.randint(6, 14))
    print(f"backfill selesai: {db.unit.count_documents({})} unit, {db.uji.count_documents({})} uji", flush=True)


def main():
    db = MongoClient(uri(), tz_aware=True, tzinfo=WIB)["jejak_mutu"]
    for coba in range(30):
        try:
            siapkan(db)
            break
        except OperationFailure as e:  # mongot (Atlas Search) kadang belum siap tepat saat start
            print(f"menunggu Atlas Search: {e.code}", flush=True)
            time.sleep(4)
    lini = Lini(db)
    backfill(db, lini)
    tick = int(os.environ.get("TICK_DETIK", "6"))
    while True:
        t = datetime.now(WIB)
        if R.random() < 0.5:
            lini.unit_baru(t)
        for u in db.unit.aggregate([{"$match": {"status": {"$in": ["di lini", "ditahan"]}}}, {"$sample": {"size": 2}}]):
            # unit ditahan baru diuji ulang setelah perbaikan (minimal 5 menit); unit lulus maju setelah 20 detik
            if (t - u["diubah_pada"]) > timedelta(seconds=300 if u["status"] == "ditahan" else 20):
                lini.maju(u, t)
        time.sleep(tick)


if __name__ == "__main__":
    main()
