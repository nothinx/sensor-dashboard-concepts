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
| Huruf judul | Newsreader 500 (serif dokumen) |
| Huruf UI dan angka | Public Sans 400/500/600, `tabular-nums lining-nums` (putaran 3; Instrument Sans dan DM Mono dilepas) |
| Map arsip manila / garis / teks tab | `#e4d3a8` / `#c9b47f` / `#4d4233` |
| Margin register / lubang perforator | `#d9a19a` / `#d8cfbf` |
| Skala tipe (`--fs-1..7`, rasio ±1.2) | 13 label/th/chip/catatan · 15 isi, sel, isian · 17 temuan · 20 h2 serif · 24 cap · 32 h1 HP · 44 h1 desktop. Tak ada `font-size` angka di luar `:root` |
| Spasi | `--sp-1..9` = 4/8/12/16/24/32/40/48/64 |
| Leading | isi 1.5, th 1.35, h2 1.25, h1 1.15 (tracking -0.015em, satu-satunya tracking negatif) |
| Radius | dua saja: `--r-1` 2 (kertas: lembar, kartu, isian, chip, tombol) dan `--r-2` 6 (benda fisik: map, tab, cap) |
| Garis | semua 1 px; satu-satunya 2 px adalah cap tinta |

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

## Putaran 3: keterbacaan dan kesan mahal

| Keputusan | Alasan |
|---|---|
| Instrument Sans + DM Mono → **Public Sans** | Instrument Sans sempit dan rapat di 13 px; DM Mono membuat tabel penuh nol bergaris miring dan kalimat ("Draf; …") ikut bergaya mesin ketik. Public Sans (huruf dokumen pemerintahan AS, OFL) punya x-height lega, angka tabular dan lining, cocok dengan dunia dokumen terkendali. Mono hanya untuk perintah di `<code>`. |
| Nomor dokumen dan ID memakai kelas `.id` | Sans 500 tabular, tracking +0.01em, tidak patah baris; tetap terbaca sebagai nomor tanpa mono. |
| Kepala kolom hari dua baris | "Sab" di atas "31 Okt"; kolom berjalan ditulis "Hari ini" beraksen, kolom total "Periode / 7 hari". Tinggi kepala seragam, tak ada `<br>berjalan`. |
| Kolom kanan `clamp(360px, 24vw, 440px)`, lembar 64/40 px | Di 1440 nama area tak lagi patah dan tabel tetap lega. |
| HP: kolom Area lengket saat tabel digeser | Angka tetap bisa dikaitkan dengan areanya. |
| Jejak audit dua baris | Pelaku kecil di atas, aksi kalimat aktif di bawah ("Laporan QA/LK/… gagal disusun"), bukan "sistem laporan … gagal". |
| Bahasa | satu istilah "tersambung" (bukan campur "terhubung"); persen dirapatkan sesuai EYD (99,0%); tanggal singkat "31 Okt sampai 6 Nov 2026" di map; "Tanggal mulai/akhir" sama dengan pesan galat. |

Verifikasi putaran 3: render 1920×1080, 1440×900, 390×844 (390 lewat iframe karena jendela headless desktop punya
lebar minimum, sehingga screenshot 390 langsung memotong halaman yang dirender lebih lebar). sloplint 0 FAIL,
1 WARN F24 (garis + bayangan lembar, disengaja). `node --check app.js` lulus. Warna tidak berubah, kontras putaran 2 berlaku.
