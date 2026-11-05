// Menyusun folder public/ untuk Firebase Hosting (emulator maupun deploy):
// salin web/ dan pustaka bersama shared/, lalu tulis konfigurasi.js dari variabel lingkungan.
// Halaman memuat ../../shared/charts.js; di hosting, path itu jatuh ke /shared/charts.js.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shared = resolve(akar, process.env.SHARED_DIR || "../shared");
const pub = join(akar, "public");

rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
cpSync(join(akar, "web"), pub, { recursive: true });
cpSync(shared, join(pub, "shared"), { recursive: true, filter: (p) => !/BRIEF|_ref-/.test(p) });

const emulator = process.env.FIREBASE_EMULATOR === "1";
const konfigurasi = {
  emulator,
  projectId: process.env.FIREBASE_PROJECT_ID || "demo-konsep",
  apiKey: process.env.FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  appId: process.env.FIREBASE_APP_ID || "",
  // akun demo hanya ditawarkan di emulator; di cloud teknisi masuk dengan akunnya sendiri
  akunDemo: emulator ? [
    { email: "teknisi1@contoh.test", nama: "Teknisi shift 1" },
    { email: "teknisi2@contoh.test", nama: "Teknisi shift 2" },
  ] : [],
  sandiDemo: emulator ? process.env.DEMO_SANDI || "" : "",
  port: { firestore: 18111, auth: 18112 },
};
writeFileSync(join(pub, "konfigurasi.js"), `// dibuat oleh alat/bangun.mjs, jangan disunting\nwindow.KONFIGURASI = ${JSON.stringify(konfigurasi, null, 2)};\n`);
console.log(`public/ siap (${emulator ? "emulator" : "cloud"}, proyek ${konfigurasi.projectId})`);
