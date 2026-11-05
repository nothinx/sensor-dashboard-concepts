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
| Map arsip manila / garis / teks tab | `#e4d3a8` / `#c9b47f` / `#4d4233` |
| Margin register / lubang perforator | `#d9a19a` / `#d8cfbf` |
| Skala tipe (1920) | isi dan sel 15, label 13, temuan 18, h2 serif 22, h1 serif 40 |
| Radius | lembar dan kartu dalam map 2, kontrol 4, map 6 dengan tab 8 |

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
- **Putaran 2, kolom kanan = map arsip**: formulir, laporan terbaru, dan jejak audit berada dalam satu map
  manila bertab "Map arsip QA/LK 2026", bukan tiga kartu SaaS. Isian formulir bergaris bawah seperti formulir
  cetak; jejak audit memakai garis margin merah seperti buku register. Lembar diberi dua lubang perforator di
  margin kiri, siap masuk map. Tata letak dilepas dari batas 1600 px supaya lembar memakai kanvas penuh.
- **Putaran 2, pratinjau**: satu penanda `data-pratinjau` di header ("Pratinjau, data contoh"); teks koneksi
  dikosongkan. Formulir tampil terisi dan aktif, tetapi kiriman hanya menjelaskan bahwa penerbitan butuh API
  (tetap tidak berpura-pura berhasil). Di luar pratinjau, perilaku nonaktif lama berlaku.

## Hasil pemeriksaan

- sloplint putaran 2: 0 FAIL, 1 REFLEX (`.tip` milik `shared/charts.css`), 1 WARN garis + bayangan lembar yang
  disengaja untuk kesan kertas. Kontras baru: teks tab pada map 6,62:1, teks utama pada map 11,56:1.
- Render 1920×1080 dan 390×844 `?pratinjau` di Chrome headless: tanpa galat konsol, tanpa geser samping.
