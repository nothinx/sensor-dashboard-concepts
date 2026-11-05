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
| `--bg` / `--surface` / `--raised` | #f7f6f3 / #ffffff / #efede8 | ramp hangat netral (unslop "warm") |
| `--ink` / `--ink-2` / `--ink-3` | #1f1b16 / #5e554a / #6f665b | teks |
| `--accent` / `--accent-bg` | #c2410c / #fdeee5 | label kartu aktif, cap waktu, item terpilih, garis tren |
| `--crit` / `--warn` / `--good` | #dc2626 / #d99000 / #16a34a | status, selalu ikon + teks |
| `--kartu` / `--kartu-garis` | #f8f1df / #e2d6b8 | stok kartu absen dan garis barisnya |
| `--meja` / `--meja-ink` / `--meja-terang` | #2a2520 / #d9d1c4 / #fbf8f2 | latar desktop di sekitar bingkai HP |
| `--bingkai` / `--lajur` | #0f0d0b / #f2b705 | bezel HP / garis lajur lantai pabrik |
| Skala tipe | 13 / 14 / 16 / 17 / 20 / 30 / 52 px | meta / label / isi / temuan / judul kartu / judul / angka sensor aktif |
| Huruf | Manrope 400/500/600 + JetBrains Mono 400/500 | antarmuka ramah, angka tabular |

Tombol utama berisi warna tinta (bukan aksen), sesuai anjuran unslop untuk tema terang.

## Kontras (diukur dengan `contrast-check.py`)

| Pasangan | Rasio |
| --- | --- |
| `--ink-3` di `--surface` / `--bg` / `--raised` | 5,63 / 5,21 / 4,82 : 1 |
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
