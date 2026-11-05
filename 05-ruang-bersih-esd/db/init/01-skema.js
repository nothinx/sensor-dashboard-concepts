// Inisialisasi MongoDB (dijalankan sekali oleh image mongo saat volume data masih kosong).
// Membuat pengguna aplikasi berhak minimum, koleksi + validator + indeks, dan data master ruang/titik.
// Angka ambang adalah CONTOH; sesuaikan dengan prosedur mutu klien sebelum dipakai.

const DBN = process.env.MONGO_INITDB_DATABASE || "ruangbersih";
const d = db.getSiblingDB(DBN);

d.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: DBN }],
});

// --- ruang: geometri denah (persen terhadap denah) + syarat ---
d.createCollection("ruang", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["_id", "nama", "geometri", "lantai"],
    properties: {
      _id: { bsonType: "string", pattern: "^[a-z0-9-]{2,20}$" },
      nama: { bsonType: "string" },
      lantai: { bsonType: "int" },
      geometri: { bsonType: "object", required: ["x", "y", "w", "h"] },
      syarat: { bsonType: "object" },
    },
  } },
});

// --- titik: satu sensor/stasiun di denah; ambang per metrik ---
d.createCollection("titik", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["_id", "ruang", "jenis", "x", "y", "ambang"],
    properties: {
      _id: { bsonType: "string", pattern: "^[A-Z0-9-]{2,20}$" },
      ruang: { bsonType: "string" },
      jenis: { enum: ["suhu_rh", "partikel", "tekanan", "ionizer", "esd"] },
      x: { bsonType: ["double", "int"], minimum: 0, maximum: 100 },
      y: { bsonType: ["double", "int"], minimum: 0, maximum: 100 },
      ambang: { bsonType: "object" },
    },
  } },
});
d.titik.createIndex({ ruang: 1 });

// --- bacaan: time-series collection, retensi 30 hari ---
d.createCollection("bacaan", {
  timeseries: { timeField: "ts", metaField: "meta", granularity: "seconds" },
  expireAfterSeconds: 60 * 60 * 24 * 30,
});
d.bacaan.createIndex({ "meta.titik": 1, ts: -1 });

// --- esd_uji: satu dokumen per uji gelang ESD di stasiun; retensi 1 tahun (jejak audit) ---
d.createCollection("esd_uji", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["ts", "stasiun", "operator", "hasil", "mohm"],
    properties: {
      stasiun: { bsonType: "string" },
      operator: { bsonType: "string", pattern: "^OP-[0-9]{3}$" },
      hasil: { enum: ["lulus", "gagal"] },
      mohm: { bsonType: ["double", "int"] },
    },
  } },
});
d.esd_uji.createIndex({ ts: -1 });
d.esd_uji.createIndex({ stasiun: 1, ts: -1 });
d.esd_uji.createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 366, name: "retensi_1_tahun" });

// --- data master ---
// Ambang: w = batas peringatan [min, max], k = batas kritis [min, max]; null = tidak dibatasi.
const iklim = (w1, w2, k1, k2, r1, r2, rk1, rk2) => ({
  suhu: { w: [w1, w2], k: [k1, k2], satuan: "°C" },
  rh: { w: [r1, r2], k: [rk1, rk2], satuan: "%RH" },
});
const SYARAT = {
  smt: iklim(22, 26, 20, 28, 40, 60, 35, 65),
  tv: iklim(22, 27, 20, 29, 40, 65, 35, 70),
  qc: iklim(22, 27, 20, 29, 40, 65, 35, 70),
  kulkas: iklim(20, 30, 18, 32, 30, 70, 25, 75),
  "gudang-esd": iklim(18, 28, 16, 30, 30, 60, 25, 65),
};

d.ruang.insertMany([
  { _id: "smt", nama: "Ruang SMT", lantai: NumberInt(1), geometri: { x: 2, y: 4, w: 36, h: 44 }, syarat: SYARAT.smt, area_esd: true },
  { _id: "tv", nama: "Perakitan TV", lantai: NumberInt(1), geometri: { x: 40, y: 4, w: 34, h: 44 }, syarat: SYARAT.tv, area_esd: true },
  { _id: "qc", nama: "Uji akhir (QC)", lantai: NumberInt(1), geometri: { x: 76, y: 4, w: 22, h: 44 }, syarat: SYARAT.qc, area_esd: true },
  { _id: "kulkas", nama: "Perakitan kulkas", lantai: NumberInt(1), geometri: { x: 2, y: 52, w: 46, h: 44 }, syarat: SYARAT.kulkas, area_esd: false },
  { _id: "airlock", nama: "Airlock & ruang ganti", lantai: NumberInt(1), geometri: { x: 50, y: 52, w: 20, h: 44 }, syarat: {}, area_esd: false },
  { _id: "gudang-esd", nama: "Gudang komponen ESD", lantai: NumberInt(1), geometri: { x: 72, y: 52, w: 26, h: 44 }, syarat: SYARAT["gudang-esd"], area_esd: true },
]);

const PARTIKEL = { p05: { w: [null, 300000], k: [null, 352000], satuan: "/m³" } }; // contoh: batas ISO 14644-1 kelas 7 untuk ≥ 0,5 µm
const IONIZER = { offset: { w: [-35, 35], k: [-50, 50], satuan: "V" }, luruh: { w: [null, 5], k: [null, 8], satuan: "s" } };
const TEKANAN = { dp: { w: [10, null], k: [5, null], satuan: "Pa" } };
const ESD = { mohm: { w: [0.75, 35], k: [0.75, 35], satuan: "MΩ" } };

d.titik.insertMany([
  { _id: "TH-SMT-01", ruang: "smt", jenis: "suhu_rh", nama: "Suhu & RH SMT barat", x: 10, y: 22, ambang: SYARAT.smt },
  { _id: "TH-SMT-02", ruang: "smt", jenis: "suhu_rh", nama: "Suhu & RH SMT timur", x: 28, y: 34, ambang: SYARAT.smt },
  { _id: "PC-SMT-01", ruang: "smt", jenis: "partikel", nama: "Penghitung partikel SMT", x: 20, y: 40, ambang: PARTIKEL },
  { _id: "ESD-SMT-01", ruang: "smt", jenis: "esd", nama: "Stasiun uji gelang SMT", x: 32, y: 14, ambang: ESD },
  { _id: "TH-TV-01", ruang: "tv", jenis: "suhu_rh", nama: "Suhu & RH perakitan TV", x: 50, y: 20, ambang: SYARAT.tv },
  { _id: "ION-TV-01", ruang: "tv", jenis: "ionizer", nama: "Ionizer meja 2", x: 58, y: 40, ambang: IONIZER },
  { _id: "ION-TV-03", ruang: "tv", jenis: "ionizer", nama: "Ionizer meja 7", x: 66, y: 34, ambang: IONIZER },
  { _id: "ESD-TV-01", ruang: "tv", jenis: "esd", nama: "Stasiun uji gelang TV", x: 45, y: 40, ambang: ESD },
  { _id: "TH-QC-01", ruang: "qc", jenis: "suhu_rh", nama: "Suhu & RH QC", x: 86, y: 22, ambang: SYARAT.qc },
  { _id: "ESD-QC-01", ruang: "qc", jenis: "esd", nama: "Stasiun uji gelang QC", x: 81, y: 40, ambang: ESD },
  { _id: "TH-PK-01", ruang: "kulkas", jenis: "suhu_rh", nama: "Suhu & RH kulkas barat", x: 14, y: 72, ambang: SYARAT.kulkas },
  { _id: "TH-PK-02", ruang: "kulkas", jenis: "suhu_rh", nama: "Suhu & RH kulkas timur", x: 36, y: 84, ambang: SYARAT.kulkas },
  { _id: "DP-AL-01", ruang: "airlock", jenis: "tekanan", nama: "Beda tekanan airlock", x: 60, y: 72, ambang: TEKANAN },
  { _id: "TH-GD-01", ruang: "gudang-esd", jenis: "suhu_rh", nama: "Suhu & RH gudang rak A", x: 80, y: 72, ambang: SYARAT["gudang-esd"] },
  { _id: "TH-GD-08", ruang: "gudang-esd", jenis: "suhu_rh", nama: "Suhu & RH gudang rak C", x: 92, y: 86, ambang: SYARAT["gudang-esd"] },
]);
