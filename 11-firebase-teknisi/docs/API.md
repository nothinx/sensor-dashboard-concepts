# Antarmuka data: Firestore + Cloud Function

Proyek ini tidak punya REST API sendiri. Aplikasi berbicara langsung dengan Firestore memakai SDK klien, dan
keamanannya dijamin oleh `firestore.rules`. Logika server ada di satu Cloud Function.

## SDK

| Bagian | Versi | Sumber |
| --- | --- | --- |
| Firebase JS SDK (aplikasi) | 10.14.1, modular | `https://www.gstatic.com/firebasejs/10.14.1/firebase-{app,firestore,auth}.js` |
| firebase-admin (simulator, fungsi) | 12.7.0 | npm |
| firebase-functions | 6.6.0 (API generasi 2) | npm |
| firebase-tools (emulator) | 13.35.1 | npm, di `emulator.Dockerfile` |

## Inisialisasi aplikasi

```js
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }), // cache offline IndexedDB
});
if (KONFIGURASI.emulator) {
  connectFirestoreEmulator(db, location.hostname, 18111);
  connectAuthEmulator(auth, `http://${location.hostname}:18112`);
}
```

`KONFIGURASI` ditulis `alat/bangun.mjs` dari variabel lingkungan (lihat docs/CLOUD.md).

## Bacaan (read)

| Kebutuhan | Kueri | Jenis |
| --- | --- | --- |
| Daftar tugas | `tugas` orderBy `dibuat` desc, limit 60 | `onSnapshot` dengan `includeMetadataChanges` |
| Nilai terakhir mesin | koleksi `mesin` | `onSnapshot` |
| Tren sensor N jam | `bacaan` where `mesinId == X` and `ts >= sekarang - N jam`, orderBy `ts` | `getDocs` saat tugas dibuka |

`metadata.hasPendingWrites` dipakai untuk menandai tugas "belum tersinkron" dan memunculkan bar sinkronisasi.

## Penulisan dari aplikasi (write)

Hanya dua perubahan ini yang lolos aturan keamanan.

**Ambil tugas** (status `baru` → `dikerjakan`):

```js
updateDoc(doc(db, "tugas", id), {
  status: "dikerjakan",
  diambilOleh: { uid: auth.currentUser.uid, nama: "Teknisi shift 1" },
  diambilPada: serverTimestamp(),
});
```

**Tutup tugas** (status `dikerjakan` → `selesai`, hanya oleh yang mengambil):

```js
updateDoc(doc(db, "tugas", id), { status: "selesai", selesaiPada: serverTimestamp(), catatan: "Bearing diganti." });
```

Penulisan tidak di-`await` di antarmuka: saat offline, layar langsung berubah dari cache lokal dan promise baru
selesai setelah tersinkron. Penolakan server (`permission-denied`, mis. tugas sudah diambil orang lain)
ditampilkan sebagai pesan galat di panel tugas.

## Aturan keamanan (ringkas)

| Koleksi | Baca | Tulis dari aplikasi |
| --- | --- | --- |
| `mesin`, `bacaan`, `teknisi` | teknisi yang masuk | tidak boleh (hanya server) |
| `tugas` | teknisi yang masuk | hanya ambil (atas nama sendiri, waktu server) dan tutup (miliknya sendiri, catatan maks. 500 karakter); tidak boleh membuat atau menghapus |

Uji otomatis: `docker compose -p konsep-11 exec simulator node uji-rules.mjs`.

## Cloud Function `bacaanMelewatiAmbang`

| Sifat | Nilai |
| --- | --- |
| Pemicu | `onDocumentCreated("bacaan/{id}")`, region `asia-southeast2` |
| Masukan | dokumen bacaan `{ mesinId, nilai, ts }` |
| Proses | dalam satu transaksi: baca mesin, perbarui `mesin.terakhir` bila bacaan lebih baru; bila `nilai > ambang` dan tidak ada tugas `baru`/`dikerjakan` untuk mesin itu, buat dokumen `tugas` |
| Prioritas | `tinggi` bila nilai > 115 % ambang, selain itu `sedang` |
| Idempoten | transaksi + cek tugas terbuka mencegah tugas ganda saat banyak bacaan datang bersamaan |

## Galat yang ditangani aplikasi

| Keadaan | Tampilan |
| --- | --- |
| Firebase gagal dimuat (CDN/jaringan) | pita galat + data contoh |
| Listener tugas gagal | pita galat dengan sebab dan langkah (periksa koneksi, muat ulang) |
| Tren gagal dimuat | pesan di kotak tren, buka ulang tugas untuk mencoba lagi |
| Penulisan ditolak | pesan di panel tugas |
| Offline | bar bawah "Offline. Perubahan disimpan di HP dan akan disinkronkan saat tersambung." |
