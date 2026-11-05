// Simulator sensor proyek 01: mengisi riwayat 24 jam (1 menit sekali), lalu menulis nilai baru tiap 5 detik.
// Nilai deterministik terhadap waktu, jadi restart tidak membuat grafik "melompat".
// Skenario kejadian dihitung relatif terhadap waktu start simulator (S).
import pg from "pg";

const db = new pg.Pool(); // PGHOST, PGUSER, PGPASSWORD, PGDATABASE dari env
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const S = Date.now();
const TZ = Number(process.env.TZ_OFFSET_MIN ?? 420) * MIN; // WIB

// derau deterministik 0..1 per (sensor, menit)
const noise = (seed, t) => {
  const x = Math.sin(seed * 12.9898 + Math.floor(t / MIN) * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const hourOf = (t) => (((t + TZ) % DAY) + DAY) % DAY / HOUR;
// beban kerja harian 0..1: naik pukul 06.00, puncak 14.00, turun pukul 22.00
const load = (t) => { const h = hourOf(t); return h < 6 || h > 22 ? 0.08 : 0.5 - 0.5 * Math.cos((2 * Math.PI * (h - 6)) / 16); };
const n = (seed, t, amp) => (noise(seed, t) - 0.5) * 2 * amp;

// menit pintu cold storage terbuka: siklus 3 jam, terbuka 12 menit; saat start sudah 9 menit terbuka
const doorMin = (t) => { const p = (((t - (S - 9 * MIN)) % (3 * HOUR)) + 3 * HOUR) % (3 * HOUR); return p < 12 * MIN ? Math.floor(p / MIN) : 0; };

const MODEL = {
  "TH-SMT1-T": (t) => 23.6 + 1.1 * load(t) + n(1, t, 0.25),
  "TH-SMT1-H": (t) => 47 + 4 * Math.sin((2 * Math.PI * hourOf(t)) / 24) + n(2, t, 1.2),
  "TC-L1-Z6": (t) => 245 + n(3, t, 0.6) + (t > S - 18 * HOUR && t < S - 17.25 * HOUR ? 3.4 : 0),
  "TH-SMT2-T": (t) => 23.9 + 1.0 * load(t) + n(4, t, 0.25),
  "TH-SMT2-H": (t) => 49 + 3 * Math.sin((2 * Math.PI * hourOf(t)) / 24) + n(5, t, 1.2),
  // L2 zona 6: naik 7 °C sejak 40 menit sebelum start (pemanas tidak mengikuti setpoint)
  "TC-L2-Z6": (t) => 245.4 + n(6, t, 0.5) + Math.min(7, Math.max(0, (t - (S - 40 * MIN)) / (40 * MIN)) * 7),
  "TH-TV-T": (t) => 24.6 + 1.3 * load(t) + n(7, t, 0.3),
  "TH-PK-T": (t) => 25.4 + 1.6 * load(t) + n(8, t, 0.3),
  "VB-K02": (t) => 3.9 + 1.4 * load(t) + n(9, t, 0.12),
  "PT-UDARA": (t) => 6.7 - 0.25 * load(t) + n(10, t, 0.05),
  "TH-GD-T": (t) => 27.5 + 2 * load(t) + n(11, t, 0.3),
  "TH-GD-08": (t) => 52 + n(12, t, 2),
  "TS-CSB": (t) => 4.1 + 0.22 * doorMin(t) + n(13, t, 0.15),
  "DS-CSB": (t) => doorMin(t),
  "TH-QC-T": (t) => 24.2 + 0.9 * load(t) + n(14, t, 0.25),
  "PM-MDP": (t) => 640 + 840 * load(t) + n(15, t, 45),
  "TH-SRV-T": (t) => 22.5 + 0.6 * load(t) + n(16, t, 0.2),
};
// TH-GD-08 berhenti mengirim sejak 8 jam 22 menit sebelum start (gateway gudang putus)
const silent = (id, t) => id === "TH-GD-08" && t > S - (8 * HOUR + 22 * MIN);

async function write(ts) {
  const times = [], ids = [], values = [];
  for (const t of ts)
    for (const [id, f] of Object.entries(MODEL)) {
      if (silent(id, t)) continue;
      times.push(new Date(t)); ids.push(id); values.push(Math.round(f(t) * 100) / 100);
    }
  if (!ids.length) return;
  await db.query(
    "INSERT INTO reading (time, sensor_id, value) SELECT * FROM unnest($1::timestamptz[], $2::text[], $3::float8[])",
    [times, ids, values],
  );
}

async function backfill() {
  const { rows } = await db.query("SELECT max(time) AS last FROM reading");
  const from = Math.max(S - DAY, rows[0].last ? rows[0].last.getTime() + MIN : 0);
  const ts = [];
  for (let t = Math.ceil(from / MIN) * MIN; t < S; t += MIN) ts.push(t);
  for (let i = 0; i < ts.length; i += 240) await write(ts.slice(i, i + 240));
  await db.query("CALL refresh_continuous_aggregate('reading_15m', now() - interval '2 days', now() - interval '15 minutes')");
  console.log(`riwayat terisi: ${ts.length} menit`);
}

async function main() {
  for (let i = 0; ; i++) {
    try { await db.query("SELECT 1 FROM sensor LIMIT 1"); break; }
    catch (e) { if (i > 30) throw e; await new Promise((r) => setTimeout(r, 2000)); }
  }
  await backfill();
  setInterval(() => write([Date.now()]).catch((e) => console.error("gagal menulis:", e.message)), 5000);
}
main().catch((e) => { console.error(e); process.exit(1); });
