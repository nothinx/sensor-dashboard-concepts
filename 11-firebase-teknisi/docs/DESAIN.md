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
- **Desktop (≥ 960 px)**: daftar dan detail berdampingan; detail otomatis berisi tugas teratas.
- Tombol utama selebar layar, tinggi 48 px (dipakai dengan sarung tangan). Tab 44 px.
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
