# Desain · Laporan Kepatuhan Mutu

Arah desain ditulis dengan format lima baris dari **unslop** karya Damir Sokolovsky
(<https://github.com/heydamir/unslop>, CC BY 4.0), dipadukan dengan panduan design-guide internal.

## Arah

| Baris | Isi |
|---|---|
| Produk | Manajer mutu menyiapkan bukti audit: lembar kepatuhan mingguan, laporan bernomor, dan jejak perubahan. |
| Karakter | formal, rapi, bisa diaudit |
| Dunia | dokumen terkendali ISO, map arsip, cap tinta biru |
| Momen | lembar kepatuhan 7 hari: tabel area × hari dengan sel di bawah ambang ditandai |
| Tanda tangan | cap "Diperiksa oleh" bertinta biru yang memuat nomor dokumen |

Pertanyaan layar: *area mana yang memenuhi syarat pekan ini, dan laporan apa yang harus diterbitkan?*
Lembar ditata seperti dokumen terkendali (kotak nomor dokumen, revisi, periode, ambang) karena hasil
akhirnya memang dicetak atau diarsipkan.

## Token

| Peran | Nilai |
|---|---|
| Latar / lembar & kartu / naik | `#efe9df` / `#fdfbf7` / `#f4efe6` |
| Garis | `#e2d9ca`, tegas `#cfc4b2` |
| Teks primer / sekunder / redup | `#1f1b16` / `#5e554a` / `#6f665b` |
| Aksen (tinta cap, tautan, kolom hari ini) | `#2b4c8c` |
| Status: baik / peringatan / kritis | chip `#e4efe3`/`#1f5128`, `#f7ead0`/`#6b4a00`, `#f6dfdc`/`#8a1f17` |
| Huruf judul | Newsreader 400/500 (serif dokumen) |
| Huruf UI | Instrument Sans 400/500/600 |
| Huruf angka & nomor | DM Mono 400/500, tabular |
| Radius | lembar 4 (kertas), kontrol 8, kartu 12 |

Kontras terukur: teks redup pada lembar 5,45:1, pada permukaan naik 4,92:1; aksen pada lembar 8,08:1;
semua chip di atas 6,7:1; tombol primer 16,56:1.

## Keputusan

- **Lembar kertas di atas meja hangat**: hanya lembar yang bernuansa kertas; kartu di kanan tetap netral.
- **Penanda sel bukan hanya warna**: sel di bawah ambang diberi latar tint dan garis kiri 3 px; teks angka
  tetap tampil. Klasifikasi memakai nilai yang tampil (1 desimal) supaya 95,0 tidak berwarna kritis.
- **Nomor dokumen jujur**: kotak nomor hanya menampilkan nomor bila ada laporan terbit untuk periode dan cakupan
  yang sama; selain itu tertulis "Draf". Nama pemeriksa tetap `[REAL DATA]`.
- **Formulir tidak berbohong**: tanpa API, formulir dinonaktifkan dengan alasan yang jelas, bukan
  menampilkan "terkirim".
- **State laporan**: antre/disusun (chip abu + bilah progres beratribut `role="progressbar"`), selesai
  (tautan unduh), gagal (sebab + langkah dari server).
- **Cetak**: `@media print` menyembunyikan kerangka aplikasi, mencetak lembar A4 dengan margin 16 mm, dan
  mempertahankan warna sel.

## Hasil pemeriksaan

- sloplint: 0 FAIL (2 REFLEX jarak kecil pada komponen bersama, 1 WARN garis + bayangan lembar yang disengaja
  untuk kesan kertas).
- Render 1920×1080 di Edge headless, mode API dan mode file.
