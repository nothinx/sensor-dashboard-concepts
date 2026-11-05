// Uji aturan keamanan firestore.rules terhadap emulator, memakai SDK klien (sama seperti aplikasi).
// Jalankan setelah simulator selesai mengisi data: docker compose -p konsep-11 exec simulator node uji-rules.mjs
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, connectFirestoreEmulator, collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, serverTimestamp,
} from "firebase/firestore";

const [fh, fp] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-konsep", apiKey: "demo-api-key" });
const auth = getAuth(app), db = getFirestore(app);
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
connectFirestoreEmulator(db, fh, Number(fp));

const ditolak = async (p, ket) => {
  await assert.rejects(p, (e) => e.code === "permission-denied", ket);
  console.log("  ditolak (benar):", ket);
};
const masuk = (n) => signInWithEmailAndPassword(auth, `teknisi${n}@contoh.test`, process.env.DEMO_SANDI);

await ditolak(getDocs(collection(db, "tugas")), "baca tugas tanpa masuk");

await masuk(1);
const semua = await getDocs(collection(db, "tugas"));
console.log(`  teknisi 1 membaca ${semua.size} tugas`);
const milikT2 = semua.docs.find((d) => d.data().status === "dikerjakan" && d.data().diambilOleh.uid === "teknisi-2");
const baru = (await getDocs(query(collection(db, "tugas"), where("status", "==", "baru")))).docs[0];
assert.ok(milikT2 && baru, "butuh satu tugas 'dikerjakan' milik teknisi 2 dan satu tugas 'baru'");

await ditolak(updateDoc(milikT2.ref, { status: "selesai", selesaiPada: serverTimestamp(), catatan: "bukan punyaku" }), "menutup tugas milik teknisi lain");
await ditolak(addDoc(collection(db, "tugas"), { status: "baru" }), "membuat tugas dari aplikasi");
await ditolak(addDoc(collection(db, "bacaan"), { mesinId: "P-01", nilai: 1 }), "menulis bacaan dari aplikasi");
await ditolak(updateDoc(baru.ref, { status: "dikerjakan", diambilOleh: { uid: "teknisi-2", nama: "palsu" }, diambilPada: serverTimestamp() }), "mengambil tugas atas nama orang lain");
await ditolak(updateDoc(baru.ref, { status: "selesai", selesaiPada: serverTimestamp(), catatan: "" }), "melompati status dikerjakan");

await updateDoc(baru.ref, { status: "dikerjakan", diambilOleh: { uid: "teknisi-1", nama: "Teknisi shift 1" }, diambilPada: serverTimestamp() });
console.log("  diizinkan (benar): mengambil tugas baru");
await ditolak(updateDoc(baru.ref, { status: "selesai", selesaiPada: serverTimestamp(), catatan: "x".repeat(501) }), "catatan lebih dari 500 karakter");
await updateDoc(baru.ref, { status: "selesai", selesaiPada: serverTimestamp(), catatan: "Uji aturan: ditutup oleh uji otomatis." });
assert.equal((await getDoc(baru.ref)).data().status, "selesai");
console.log("  diizinkan (benar): menutup tugas sendiri");

await signOut(auth);
console.log("uji aturan lulus");
process.exit(0);
