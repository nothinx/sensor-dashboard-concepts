// API Pemantauan Ruang Bersih & ESD.
// REST untuk snapshot dan riwayat, Server-Sent Events (SSE) untuk pembaruan berkala.
// Juga menyajikan dasbor statis (web/) dan pustaka grafik bersama (shared/).
import express from "express";
import { MongoClient } from "mongodb";
import { nilaiStatus, terburuk } from "./status.js";

const {
  MONGO_URL,
  MONGO_DB = "ruangbersih",
  PORT = "8080",
  CORS_ORIGIN = "http://localhost:18050",
  SSE_INTERVAL_MS = "5000",
} = process.env;
if (!MONGO_URL) throw new Error("MONGO_URL wajib diisi");

const OFFLINE_MS = 2 * 60 * 1000; // titik tanpa bacaan > 2 menit dianggap offline
const METRIK = { suhu_rh: ["suhu", "rh"], partikel: ["p05"], tekanan: ["dp"], ionizer: ["offset", "luruh"], esd: [] };

const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
await client.connect();
const db = client.db(MONGO_DB);

async function snapshot() {
  const now = Date.now();
  const awalHari = new Date(); awalHari.setHours(0, 0, 0, 0); // zona waktu dari env TZ
  const [ruang, titik, terakhir, esdHari, esdTerakhir] = await Promise.all([
    db.collection("ruang").find().sort({ "geometri.y": 1, "geometri.x": 1 }).toArray(),
    db.collection("titik").find().sort({ _id: 1 }).toArray(),
    db.collection("bacaan").aggregate([
      { $match: { ts: { $gte: new Date(now - 26 * 3600e3) } } },
      { $sort: { ts: -1 } },
      { $group: { _id: "$meta.titik", doc: { $first: "$$ROOT" } } },
    ]).toArray(),
    db.collection("esd_uji").aggregate([
      { $match: { ts: { $gte: awalHari } } },
      { $group: { _id: { stasiun: "$stasiun", hasil: "$hasil" }, n: { $sum: 1 } } },
    ]).toArray(),
    db.collection("esd_uji").find().sort({ ts: -1 }).limit(8).toArray(),
  ]);
  const lastBy = Object.fromEntries(terakhir.map((r) => [r._id, r.doc]));
  const esdBy = {};
  for (const r of esdHari) (esdBy[r._id.stasiun] ??= { lulus: 0, gagal: 0 })[r._id.hasil] = r.n;
  const ujiTerakhirBy = {};
  for (const u of await db.collection("esd_uji").aggregate([{ $sort: { ts: -1 } }, { $group: { _id: "$stasiun", doc: { $first: "$$ROOT" } } }]).toArray())
    ujiTerakhirBy[u._id] = u.doc;

  const titikOut = titik.map((t) => {
    if (t.jenis === "esd") {
      const u = ujiTerakhirBy[t._id];
      const hari = esdBy[t._id] || { lulus: 0, gagal: 0 };
      const status = !u ? "off" : u.hasil === "gagal" ? "warn" : "ok";
      return { ...t, id: t._id, status, ts: u?.ts ?? null, nilai: u ? { mohm: u.mohm, hasil: u.hasil } : {}, hari };
    }
    const r = lastBy[t._id];
    if (!r || now - r.ts.getTime() > OFFLINE_MS) return { ...t, id: t._id, status: "off", ts: r?.ts ?? null, nilai: {} };
    const nilai = Object.fromEntries(METRIK[t.jenis].map((m) => [m, r[m]]));
    const per = Object.fromEntries(METRIK[t.jenis].map((m) => [m, nilaiStatus(r[m], t.ambang[m])]));
    return { ...t, id: t._id, status: terburuk(Object.values(per)), statusMetrik: per, ts: r.ts, nilai };
  });

  const ruangOut = ruang.map((g) => {
    const tt = titikOut.filter((t) => t.ruang === g._id);
    return { ...g, id: g._id, status: terburuk(tt.map((t) => t.status)), titik: tt.map((t) => t.id) };
  });
  const total = Object.values(esdBy).reduce((a, b) => ({ lulus: a.lulus + b.lulus, gagal: a.gagal + b.gagal }), { lulus: 0, gagal: 0 });
  return {
    ts: new Date(now),
    ruang: ruangOut,
    titik: titikOut,
    esd: { hari_ini: total, terakhir: esdTerakhir.map(({ _id, ...u }) => u) },
  };
}

const app = express();
app.disable("x-powered-by");
app.use("/api", (req, res, next) => {
  res.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.set("Cache-Control", "no-store");
  next();
});
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

app.get("/api/health", wrap(async (_req, res) => {
  await db.command({ ping: 1 });
  res.json({ status: "ok" });
}));

app.get("/api/snapshot", wrap(async (_req, res) => res.json(await snapshot())));

app.get("/api/titik/:id/riwayat", wrap(async (req, res) => {
  const { id } = req.params;
  const jam = Number(req.query.jam ?? 24);
  const langkah = Number(req.query.langkah ?? 15);
  if (!/^[A-Z0-9-]{2,20}$/.test(id)) return res.status(400).json({ galat: "ID titik tidak valid" });
  if (!Number.isInteger(jam) || jam < 1 || jam > 168) return res.status(400).json({ galat: "jam harus bilangan bulat 1 sampai 168" });
  if (![1, 5, 15, 60].includes(langkah)) return res.status(400).json({ galat: "langkah harus 1, 5, 15, atau 60 menit" });
  const t = await db.collection("titik").findOne({ _id: id });
  if (!t) return res.status(404).json({ galat: `Titik ${id} tidak ditemukan` });
  const metrik = METRIK[t.jenis];
  if (!metrik.length) return res.status(400).json({ galat: "Titik ESD tidak punya deret waktu; pakai data uji di snapshot" });
  const deret = await db.collection("bacaan").aggregate([
    { $match: { "meta.titik": id, ts: { $gte: new Date(Date.now() - jam * 3600e3) } } },
    { $group: {
      _id: { $dateTrunc: { date: "$ts", unit: "minute", binSize: langkah } },
      ...Object.fromEntries(metrik.map((m) => [m, { $avg: `$${m}` }])),
    } },
    { $sort: { _id: 1 } },
  ]).toArray();
  res.json({ titik: id, jenis: t.jenis, langkah_menit: langkah, ambang: t.ambang, deret: deret.map(({ _id, ...v }) => ({ ts: _id, ...v })) });
}));

// SSE: kirim snapshot penuh setiap SSE_INTERVAL_MS.
// ponytail: polling Mongo per klien; untuk banyak klien, hitung sekali lalu siarkan ke semua koneksi.
app.get("/api/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", Connection: "keep-alive" });
  res.flushHeaders();
  const kirim = async () => {
    try { res.write(`event: snapshot\ndata: ${JSON.stringify(await snapshot())}\n\n`); }
    catch (e) { res.write(`event: galat\ndata: ${JSON.stringify({ galat: e.message })}\n\n`); }
  };
  kirim();
  const iv = setInterval(kirim, Number(SSE_INTERVAL_MS));
  req.on("close", () => clearInterval(iv));
});

app.use("/shared", express.static("/app/shared"));
app.use(express.static("/app/web"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ galat: "Kesalahan server; periksa log layanan api" });
});

app.listen(Number(PORT), () => console.log(`API ruang bersih di port ${PORT}`));
