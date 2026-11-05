// Simulator sensor ruang bersih: membaca daftar titik dari MongoDB, mengisi riwayat 24 jam
// bila koleksi masih kosong, lalu menulis bacaan baru setiap SIM_INTERVAL_MS.
// Skenario contoh: ionizer ION-TV-03 offset tinggi, RH SMT turun pagi hari, TH-GD-08 offline.
import { MongoClient } from "mongodb";

const { MONGO_URL, MONGO_DB = "ruangbersih", SIM_INTERVAL_MS = "5000" } = process.env;
if (!MONGO_URL) throw new Error("MONGO_URL wajib diisi");
const OFFLINE_SEJAK_JAM = 6; // TH-GD-08 berhenti mengirim 6 jam lalu

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db(MONGO_DB);
const titik = await db.collection("titik").find().toArray();

const jamDesimal = (t) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
const derau = (s) => (Math.random() - 0.5) * s;
const harian = (t, puncak = 14) => Math.cos(((jamDesimal(t) - puncak) / 24) * 2 * Math.PI); // 1 di jam puncak

function bacaan(p, t) {
  const h = harian(t);
  const meta = { titik: p._id, ruang: p.ruang, jenis: p.jenis };
  switch (p.jenis) {
    case "suhu_rh": {
      const [lo, hi] = p.ambang.suhu.w, [rlo, rhi] = p.ambang.rh.w;
      let rh = (rlo + rhi) / 2 + 4 * h + derau(1.2);
      if (p.ruang === "smt") { const j = jamDesimal(t); if (j > 5.5 && j < 8.5) rh = 42.5 + derau(0.6); } // AC kering pagi
      return { ts: new Date(t), meta, suhu: +((lo + hi) / 2 - 0.3 + 1.1 * h + derau(0.3)).toFixed(2), rh: +rh.toFixed(1) };
    }
    case "partikel": {
      const j = jamDesimal(t), gantiShift = Math.abs(j - 14) < 0.2 || Math.abs(j - 22) < 0.2 || Math.abs(j - 6) < 0.2;
      return { ts: new Date(t), meta, p05: Math.round(18000 + 3000 * h + derau(2500) + (gantiShift ? 60000 : 0)) };
    }
    case "tekanan":
      return { ts: new Date(t), meta, dp: +(13 + derau(1.4)).toFixed(1) };
    case "ionizer": {
      const buruk = p._id === "ION-TV-03";
      return { ts: new Date(t), meta, offset: +((buruk ? 38 : 6) + derau(3)).toFixed(1), luruh: +((buruk ? 4.2 : 2.6) + derau(0.4)).toFixed(2) };
    }
    default: return null;
  }
}

const ujiEsd = (stasiun, t) => {
  const gagal = Math.random() < 0.012;
  const op = `OP-${String(1 + Math.floor(Math.random() * 60)).padStart(3, "0")}`;
  return { ts: new Date(t), stasiun, operator: op, hasil: gagal ? "gagal" : "lulus", mohm: +(gagal ? 48 + Math.random() * 40 : 1.2 + Math.random() * 8).toFixed(2) };
};

const sensor = titik.filter((p) => p.jenis !== "esd");
const stasiun = titik.filter((p) => p.jenis === "esd").map((p) => p._id);
const hidup = (p, t) => !(p._id === "TH-GD-08" && t > Date.now() - OFFLINE_SEJAK_JAM * 3600e3);

if ((await db.collection("bacaan").estimatedDocumentCount()) === 0) {
  const now = Date.now(), docs = [];
  for (let t = now - 24 * 3600e3; t < now; t += 5 * 60e3) for (const p of sensor) if (hidup(p, t)) docs.push(bacaan(p, t));
  await db.collection("bacaan").insertMany(docs);
  const awal = new Date(); awal.setHours(6, 0, 0, 0);
  const uji = [];
  for (let t = awal.getTime(); t < now; t += 40e3 + Math.random() * 80e3) uji.push(ujiEsd(stasiun[Math.floor(Math.random() * stasiun.length)], t));
  if (uji.length) await db.collection("esd_uji").insertMany(uji);
  console.log(`riwayat diisi: ${docs.length} bacaan, ${uji.length} uji ESD`);
}

async function tick() {
  const t = Date.now();
  const docs = sensor.filter((p) => hidup(p, t)).map((p) => bacaan(p, t));
  await db.collection("bacaan").insertMany(docs);
  if (Math.random() < 0.15) await db.collection("esd_uji").insertOne(ujiEsd(stasiun[Math.floor(Math.random() * stasiun.length)], t));
}
setInterval(() => tick().catch((e) => console.error("tick gagal:", e.message)), Number(SIM_INTERVAL_MS));
console.log(`simulator jalan: ${sensor.length} sensor, ${stasiun.length} stasiun ESD`);
