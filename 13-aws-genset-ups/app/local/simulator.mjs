// Simulator lokal: meniru perangkat cabang yang mengirim pesan ke AWS IoT Core.
// Tiap pesan dibentuk persis seperti event IoT Rule lalu diteruskan ke handler Lambda ingest.
import { handler as ingest } from "../functions/ingest.mjs";
import { CABANG, siapkanTabel } from "./cabang.mjs";

const TICK_MS = Number(process.env.TICK_DETIK || 10) * 1000;
const T0 = Date.now();
const mnt = (m) => T0 + m * 60000;

// Skenario relatif terhadap waktu start: [kode, mulai (menit dari sekarang), durasi menit atau null = masih padam, genset gagal start]
const PADAM = [
  ["SMG", -1200, 45, false], ["MDN", -540, 120, false], ["BPN", -840, 300, false],
  ["PLM", -190, null, false], ["MKS", -14, null, true],
];
const BBM_AWAL = { BPN: 47, PLM: 55, MDN: 88, SMG: 92 };

const keadaan = Object.fromEntries(CABANG.map((c, i) => [c.kode, {
  bbm: BBM_AWAL[c.kode] ?? 96 - (i % 4) * 3, baterai: 100, jamJalan: 1200 + i * 137,
  beban: c.kode === "DPS" ? 84 : 42 + (i * 7) % 25, gagalDiatasi: false,
}]));

let benih = 7;
const acak = () => ((benih = (benih * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5);
const r1 = (v) => Math.round(v * 10) / 10;

function padamPada(kode, t) {
  return PADAM.find(([k, m, d]) => k === kode && t >= mnt(m) && (d === null || t < mnt(m + d)));
}

// Maju dt menit, lalu bentuk pesan IoT untuk satu cabang.
function langkah(c, t, dtMnt, simpanRiwayat) {
  const s = keadaan[c.kode];
  const p = padamPada(c.kode, t);
  const padam = Boolean(p);
  const gagal = padam && p[3] && !s.gagalDiatasi;
  const gensetJalan = padam && !gagal;
  if (gensetJalan) { s.bbm = Math.max(0, s.bbm - (6 / 60) * dtMnt); s.jamJalan += dtMnt / 60; }
  if (padam && !gensetJalan) s.baterai = Math.max(0, s.baterai - 4 * dtMnt);     // ±25 menit pada beban normal
  else s.baterai = Math.min(100, s.baterai + (10 / 60) * dtMnt);                  // mengisi ulang
  if (gagal && s.baterai <= 15) s.gagalDiatasi = true; // teknisi menyalakan genset secara manual
  const beban = Math.max(5, Math.min(99, s.beban + acak() * 6));
  return {
    topic: `konsep/cabang/${c.kode}/telemetri`, ts: new Date(t).toISOString(), simpanRiwayat,
    pln: { ada: !padam },
    genset: {
      jalan: gensetJalan, bbm: r1(s.bbm), jamJalan: r1(s.jamJalan),
      tegangan: gensetJalan ? r1(230 + acak() * 4) : 0, frekuensi: gensetJalan ? r1(50 + acak() * 0.3) : 0,
    },
    ups: { baterai: r1(s.baterai), runtime: r1((s.baterai / 100) * 25 * (50 / beban)), beban: r1(beban) },
  };
}

async function main() {
  const baru = await siapkanTabel();
  if (baru) {
    console.log("Mengisi riwayat 24 jam (langkah 5 menit)…");
    for (let t = T0 - 24 * 36e5; t <= T0; t += 5 * 60000) {
      for (const c of CABANG) await ingest(langkah(c, t, 5, true));
    }
    console.log("Riwayat selesai.");
  }
  let n = 0;
  setInterval(async () => {
    const simpan = ++n % Math.max(1, Math.round(60000 / TICK_MS)) === 0; // riwayat tiap ±1 menit
    try {
      for (const c of CABANG) await ingest(langkah(c, Date.now(), TICK_MS / 60000, simpan));
    } catch (e) { console.error("Tick gagal:", e.message); }
  }, TICK_MS);
}

main().catch((e) => { console.error(e); process.exit(1); });
