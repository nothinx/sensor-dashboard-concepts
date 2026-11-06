# Desain: Aplikasi Teknisi Lapangan

## Arah (format lima baris unslop)

Format arah diambil dari [unslop](https://github.com/heydamir/unslop) karya Damir Sokolovsky, lisensi CC BY 4.0.

- **Produk.** Teknisi lapangan menerima dan menutup tugas mesin dari HP.
- **Karakter.** Sigap, ringkas, bersahabat.
- **Dunia.** Sabuk perkakas, lantai pabrik, kartu absen mesin jam.
- **Momen.** Kartu "Sedang kamu kerjakan" dengan tren sensor besar dan garis ambang, di atas daftar.
- **Tanda tangan.** Cap waktu "Diambil oleh Teknisi shift 1, pukul 11.34" bergaya kartu absen: bingkai oranye,
  waktu dalam huruf mono. Muncul di setiap tugas yang sudah diambil.

## Pertanyaan layar

"Tugas apa yang harus saya kerjakan sekarang?" Temuan di bawah judul menyebut jumlah tugas baru, jumlah prioritas
tinggi, dan mesin terlama yang menunggu.

## Tata letak

- **HP (utama, 390 px)**: satu kolom. Judul, kartu tugas aktif, tab Baru/Dikerjakan/Selesai, daftar. Membuka tugas
  mengganti daftar dengan detail (tombol "Kembali ke daftar").
- **Desktop kecil (960 sampai 1279 px)**: daftar dan detail berdampingan; detail otomatis berisi tugas teratas.
- **Desktop lebar (≥ 1280 px)**: aplikasi HP disajikan dalam bingkai HP 430 px di atas "meja bengkel" gelap
  (layar utama tetap tampilan HP), ditemani panel konteks: kartu tugas terpilih 40 px, kartu absen tugas
  (jam dibuat, diambil, selesai), tren 24 jam setinggi 300 px, dan rak kartu absen semua tugas shift ini.
- Tombol utama selebar layar, tinggi 52 px (dipakai dengan sarung tangan). Tab 48 px.
- Dunia di lebih banyak permukaan: kartu aktif, detail, dan layar masuk berupa kartu absen (stok krem, lubang
  jepit di tepi atas, baris jam bergaris); cap waktu bertinta oranye sedikit miring; bilah sinkron bergaris lajur
  kuning lantai pabrik; tab bertepi tegas seperti kantong sabuk perkakas; item daftar punya pita prioritas kiri.
- Di HP ≤ 480 px penanda pratinjau menjadi pita tipis selebar layar di bawah bilah supaya tombol Keluar tetap utuh.
- Bar sinkronisasi menempel di bawah, menghormati `safe-area-inset`.

## PWA

`manifest.webmanifest` (standalone, bahasa id) dan `sw.js` (kerangka aplikasi jaringan-dulu, cache bila offline).
Data tugas offline ditangani cache IndexedDB Firestore. Ikon masih sementara `[REAL DATA: aset ikon]`.

## Token

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | #f4f2ec / #fffdf8 / #ebe7dd | ramp hangat netral (unslop "warm"); permukaan putih hangat, bukan #fff murni |
| `--ink` / `--ink-2` / `--ink-3` | #1f1b16 / #5e554a / #6f665b | teks |
| `--accent` / `--accent-bg` | #c2410c / #fdeee5 | label kartu aktif, cap waktu, item terpilih, garis tren |
| `--crit` / `--warn` / `--good` | #dc2626 / #d99000 / #16a34a | status, selalu ikon + teks |
| `--kartu` / `--kartu-garis` | #f8f1df / #e2d6b8 | stok kartu absen dan garis barisnya |
| `--meja` / `--meja-ink` / `--meja-terang` | #2a2520 / #d9d1c4 / #fbf8f2 | latar desktop di sekitar bingkai HP; bilah atas ikut gelap di desktop lebar |
| `--meja-garis` / `--meja-hover` | terang 14% / 8% | garis dan hover di atas meja |
| `--bingkai` / `--lajur` | #0f0d0b / #f2b705 | bezel HP / garis lajur lantai pabrik |
| Skala tipe `--t-*` | 13 / 15 / 17 / 20 / 28 / 40 / 56 px | meta, chip, sumbu / label / isi / judul kartu, angka daftar / judul layar HP / judul panel desktop, angka pemicu / angka sensor aktif |
| Leading | isi 1,5 / judul 1,2 / angka 1,0 | tracking negatif hanya ≥ 28 px (-0,015em; 56 px -0,02em) |
| Jarak `--sp-*` | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 px | semua padding, gap, margin |
| Sudut / garis | `--r-s` 4 px, `--r` 8 px / `--bw` 1 px, `--bw-tinta` 2 px | 2 px hanya untuk tinta cap dan garis kop kartu absen |
| Huruf | Manrope 400/500/600 + JetBrains Mono 500 | semua teks dan angka Manrope (tabular, lining); mono hanya ID mesin dan jam cap |
| Grafik bersama | `--chart-font` Manrope, `--chart-fs`/`--tip-fs`/`--st-fs` 13 px | sumbu dan chip tidak lagi mono |

Tombol utama berisi warna tinta (bukan aksen), sesuai anjuran unslop untuk tema terang.

## Kontras (diukur dengan `contrast-check.py`)

| Pasangan | Rasio |
| --- | --- |
| `--ink-3` di `--surface` / `--bg` / `--raised` | 5,98 / 5,43 / 4,82 : 1 |
| `--surface` (teks tombol utama) di `--ink` | 16,84 : 1 |
| `--accent` di `--accent-bg` (cap waktu) | 4,57 : 1 |
| `--accent` di putih | 5,18 : 1 |
| chip peringatan / kritis / normal | 7,48 / 7,33 / 8,01 : 1 |
| teks putih di tombol utama | 17,12 : 1 |
| `--ink-3` / `--accent` / `--crit-ink` di `--kartu` | 5,39 / 4,60 / 7,89 : 1 |
| `--meja-ink` / `--meja-terang` di `--meja` | 10,02 / 14,31 : 1 |

## Keputusan putaran 2

- Tepat satu penanda `data-pratinjau` di bilah atas, hanya tampil di mode data contoh; di pratinjau berbunyi
  "Pratinjau, data contoh". Saat Firebase hidup penanda tersembunyi dan alur masuk tetap berjalan.
- Rak kartu absen hanya di desktop lebar; klik kartu membuka tugas memakai jalur `data-buka` yang sudah ada.

## Keputusan putaran 3 (keterbacaan, bahasa, kerapian)

| Keputusan | Alasan |
| --- | --- |
| Manrope dipertahankan, JetBrains Mono dipangkas ke satu bobot dan dua peran (ID mesin, jam cap) | Manrope ber-x-height lega dan punya `tnum`/`lnum`; rasa tak nyaman datang dari mono di angka besar, sumbu, nama teknisi, dan kop. Font proyek lain sudah dipakai konsep lain, jadi Manrope tetap pembeda konsep ini. |
| Satu skala tujuh langkah di `:root`, tak ada `font-size` angka di luar `:root` | Ukuran lama (12/13/14/15/16/17/18/24/30/40/52) bercampur per selektor. |
| Angka = Manrope 500 tabular, satuan 15-20 px warna `--ink-2` dipisah `&thinsp;` | Angka "96,1" mono berkoma lebar terbaca seperti kode. |
| Garis 1 px di semua kartu, item, tab, tombol; 2 px hanya tinta | Dulu 1,5 / 2 px campur, terasa kasar. Pita prioritas jadi garis 3 px di dalam kartu, bukan sisi tebal. |
| Bilah atas gelap di desktop lebar | Bilah putih memotong "meja bengkel"; kini satu bidang tenang dengan bingkai HP sebagai titik terang. |
| Status chip pindah ke bawah judul detail; status rak ditulis "Baru/Dikerjakan/Selesai" | Chip dulu melayang sendirian di pojok kanan; rak menampilkan kunci data mentah huruf kecil. |
| Baris jam rak satu garis per baris (`span` flex) | Garis label dan jam dulu putus di celah kolom. |
| `.kolom-daftar` memakai `grid-auto-rows: max-content` | Di bingkai HP tinggi tetap, tab ber-`overflow: hidden` mengerut jadi 0 px dan hilang. |
| Temuan menyebut tugas yang benar-benar paling lama menunggu | Kode lama mengambil tugas terbaru (urutan desc) tapi menulis "Terlama". |
| Bahasa: "mnt" → "menit" (nbsp), "Offline" → "Tidak ada sinyal", "belum tersinkron" → "Belum terkirim", "Mulai kerjakan" → "Ambil tugas ini", "Selesai" (tombol) → "Tandai selesai", "-" jam kosong → "belum" | Satu istilah per konsep (ambil, terkirim), tanpa singkatan dan campur Inggris. |
