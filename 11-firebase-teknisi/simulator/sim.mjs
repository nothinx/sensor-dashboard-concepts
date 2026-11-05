// Simulator untuk Firebase Emulator: menyiapkan akun teknisi, mesin, riwayat tugas, lalu menulis bacaan sensor.
// Cloud Function `bacaanMelewatiAmbang` di emulator yang membuat tugas baru dari bacaan yang melewati ambang.
// Hanya untuk emulator: menolak berjalan bila FIRESTORE_EMULATOR_HOST kosong.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const FS = process.env.FIRESTORE_EMULATOR_HOST, AU = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const PROYEK = process.env.GCLOUD_PROJECT || "demo-konsep";
if (!FS || !AU) throw new Error("Simulator hanya untuk emulator: isi FIRESTORE_EMULATOR_HOST dan FIREBASE_AUTH_EMULATOR_HOST.");
const HUB = process.env.EMULATOR_HUB || "emulator:18115";
const TICK_MS = Number(process.env.TICK_DETIK || 15) * 1000;

initializeApp({ projectId: PROYEK });
const db = getFirestore();
const T0 = Date.now();
const ts = (menitLalu) => Timestamp.fromMillis(T0 - menitLalu * 60000);

// [id, nama, lokasi, besaran, satuan, normal, ambang, desimal, skenario: menit lalu mulai naik (null = normal)]
const MESIN = [
  ["P-01", "Pompa air pendingin P-01", "Gedung utilitas", "Getaran", "mm/s", 2.4, 4.5, 1, 30],
  ["OV-L2", "Oven reflow Line 2, zona 6", "Ruang SMT", "Suhu", "°C", 245, 250, 1, 40],
  ["K-02", "Kompresor udara K-02", "Gedung utilitas", "Suhu keluaran", "°C", 82, 95, 1, 75],
  ["CV-TV", "Konveyor perakitan TV", "Perakitan TV", "Arus motor", "A", 6.2, 8.5, 1, null],
  ["AHU-1", "AHU produksi 1", "Atap gedung produksi", "Suhu udara pasok", "°C", 16, 20, 1, null],
  ["CH-01", "Chiller 1", "Gedung utilitas", "Tekanan kondensor", "bar", 12.5, 16, 1, null],
  ["GS-SBY", "Genset Cabang Surabaya", "Cabang Surabaya", "Suhu air pendingin", "°C", 78, 95, 0, null],
  ["MDP", "Panel listrik utama", "Ruang panel", "Suhu busbar", "°C", 52, 70, 0, null],
];

let benih = 11;
const acak = () => ((benih = (benih * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5);

function nilai(m, menitLalu) {
  const [, , , , , normal, ambang, dec, mulai] = m;
  // naik-turun harian + derau, selalu di bawah ambang (maks normal + 35 % jarak ke ambang)
  const jarak = ambang - normal;
  let v = normal + jarak * (0.2 * Math.sin((T0 / 60000 - menitLalu) / 180) + 0.3 * acak());
  if (mulai !== null && menitLalu <= mulai) v += (ambang - normal) * (1.25 * (1 - menitLalu / mulai) + 0.05);
  return Number(v.toFixed(dec));
}

async function tunggu(url, cocok) {
  for (let i = 0; i < 180; i++) {
    try { const r = await fetch(url); if (r.ok && cocok(await r.text())) return; } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Emulator tidak siap: ${url}`);
}

async function kosongkan() {
  await fetch(`http://${FS}/emulator/v1/projects/${PROYEK}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${AU}/emulator/v1/projects/${PROYEK}/accounts`, { method: "DELETE" });
}

async function siapkan() {
  const sandi = process.env.DEMO_SANDI;
  if (!sandi || sandi.length < 8) throw new Error("Isi DEMO_SANDI (minimal 8 karakter) di .env");
  const T = [["teknisi-1", "teknisi1@contoh.test", "Teknisi shift 1", "Utilitas & produksi"], ["teknisi-2", "teknisi2@contoh.test", "Teknisi shift 2", "Utilitas & cabang"]];
  for (const [uid, email, nama, area] of T) {
    await getAuth().createUser({ uid, email, password: sandi, displayName: nama });
    await db.doc(`teknisi/${uid}`).set({ nama, area });
  }
  const b = db.batch();
  for (const [id, nama, lokasi, besaran, satuan, normal, ambang] of MESIN) b.set(db.doc(`mesin/${id}`), { nama, lokasi, besaran, satuan, normal, ambang, terakhir: null });
  // riwayat: dua tugas selesai dan satu sedang dikerjakan (ditulis server; aplikasi tidak boleh membuat tugas)
  const tugas = (mid, nilaiPemicu, prioritas, status, dibuat, extra) => {
    const m = MESIN.find((x) => x[0] === mid);
    b.set(db.collection("tugas").doc(), {
      mesinId: mid, mesinNama: m[1], lokasi: m[2], besaran: m[3], satuan: m[4], ambang: m[6], nilaiPemicu, prioritas, status,
      dibuat: ts(dibuat), diambilOleh: null, diambilPada: null, selesaiPada: null, catatan: "", ...extra,
    });
  };
  const t2 = { uid: "teknisi-2", nama: "Teknisi shift 2" }, t1 = { uid: "teknisi-1", nama: "Teknisi shift 1" };
  tugas("K-02", 97.4, "sedang", "dikerjakan", 75, { diambilOleh: t1, diambilPada: ts(62) });
  tugas("AHU-1", 20.6, "sedang", "dikerjakan", 50, { diambilOleh: t2, diambilPada: ts(41) });
  tugas("MDP", 73.1, "sedang", "selesai", 300, { diambilOleh: t1, diambilPada: ts(290), selesaiPada: ts(245), catatan: "Baut busbar fasa R dikencangkan; suhu turun ke 54 °C." });
  tugas("CH-01", 16.8, "sedang", "selesai", 420, { diambilOleh: t2, diambilPada: ts(400), selesaiPada: ts(350), catatan: "Kondensor dibersihkan." });
  await b.commit();
}

async function isiRiwayat() {
  // 24 jam, tiap 20 menit; tiap dokumen memicu Cloud Function di emulator
  for (let lalu = 24 * 60; lalu >= 0; lalu -= 20) {
    const b = db.batch();
    for (const m of MESIN) b.set(db.collection("bacaan").doc(), { mesinId: m[0], nilai: nilai(m, lalu), ts: ts(lalu) });
    await b.commit();
  }
}

async function main() {
  await tunggu(`http://${FS}/`, (t) => t.includes("Ok"));
  await tunggu(`http://${HUB}/emulators`, (t) => t.includes("functions"));
  await kosongkan();
  await siapkan();
  console.log("Akun, mesin, dan riwayat tugas siap. Mengisi bacaan 24 jam…");
  await isiRiwayat();
  console.log("Riwayat selesai. Bacaan baru tiap", TICK_MS / 1000, "detik.");
  setInterval(async () => {
    try {
      const lalu = -(Date.now() - T0) / 60000; // menit "lalu" negatif = setelah start
      const b = db.batch();
      for (const m of MESIN) b.set(db.collection("bacaan").doc(), { mesinId: m[0], nilai: nilai(m, Math.max(0, lalu)), ts: Timestamp.now() });
      await b.commit();
    } catch (e) { console.error("Tick gagal:", e.message); }
  }, TICK_MS);
}

main().catch((e) => { console.error(e); process.exit(1); });
