// Cloud Function (generasi 2): setiap dokumen `bacaan` baru dinilai terhadap ambang mesinnya.
// Melewati ambang dan belum ada tugas terbuka untuk mesin itu -> buat dokumen `tugas` berstatus "baru".
// Transaksi mencegah tugas ganda saat beberapa bacaan datang bersamaan.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.bacaanMelewatiAmbang = onDocumentCreated(
  { document: "bacaan/{id}", region: "asia-southeast2" },
  async (event) => {
    const b = event.data?.data();
    if (!b || typeof b.nilai !== "number" || !b.mesinId) return;
    const db = getFirestore();
    const mesinRef = db.doc(`mesin/${b.mesinId}`);

    await db.runTransaction(async (tx) => {
      const mesin = await tx.get(mesinRef);
      if (!mesin.exists) return;
      const m = mesin.data();
      const lewat = b.nilai > m.ambang;
      const terbuka = lewat
        ? await tx.get(db.collection("tugas").where("mesinId", "==", b.mesinId).where("status", "in", ["baru", "dikerjakan"]).limit(1))
        : null;

      // nilai terakhir di dokumen mesin, hanya bila bacaan ini lebih baru
      if (!m.terakhir || b.ts.toMillis() > m.terakhir.ts.toMillis()) {
        tx.update(mesinRef, { terakhir: { nilai: b.nilai, ts: b.ts } });
      }
      if (!lewat || !terbuka.empty) return;

      tx.create(db.collection("tugas").doc(), {
        mesinId: b.mesinId, mesinNama: m.nama, lokasi: m.lokasi, besaran: m.besaran, satuan: m.satuan,
        ambang: m.ambang, nilaiPemicu: b.nilai,
        prioritas: b.nilai > m.ambang * 1.15 ? "tinggi" : "sedang",
        status: "baru", dibuat: b.ts, diambilOleh: null, diambilPada: null, selesaiPada: null, catatan: "",
      });
    });
  },
);
