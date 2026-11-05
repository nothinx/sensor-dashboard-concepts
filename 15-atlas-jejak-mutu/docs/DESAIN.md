# Desain · Jejak Mutu

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Insinyur mutu melacak satu unit TV atau kulkas dari lini sampai gudang saat ada keluhan.
- **Karakter.** Teliti, sabar, terang-benderang.
- **Dunia.** Label nomor seri, stiker QC di bodi unit, map arsip hasil uji.
- **Momen.** Garis waktu perjalanan unit: empat stasiun berurutan dengan hasil, besaran uji, dan riwayat
  percobaan (gagal lalu lulus setelah perbaikan).
- **Tanda tangan.** Stiker "QC lulus" berperforasi dengan kode stasiun dan operator, sedikit miring seperti
  ditempel tangan. Versi merah "Ditahan" memuat kode cacat. Hanya muncul di garis waktu.

## Pertanyaan layar

"Di mana unit bernomor seri ini tertahan, dan kenapa?" Jawabannya kalimat temuan di bawah nomor seri
(stasiun, pukul, kode cacat, catatan) dan stiker merah pada garis waktu. Elemen paling menonjol di layar
adalah kolom cari, karena setiap sesi dimulai dari nomor seri.

## Tata letak

- Kolom cari selebar konten, tinggi 56 px, huruf mono 20 px supaya nomor seri terbaca per karakter. Di
  bawahnya pintasan unit yang sedang ditahan dan yang terakhir punya cacat.
- Dua kolom: unit terpilih (fluid) dan kolom samping 380 px (angka hari ini, kode cacat 7 hari, umpan
  kejadian). Di bawah 1200 px bertumpuk; di bawah 900 px garis waktu menjadi 2 × 2.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#f5f7fa` / `#ffffff` / `#eceff4` | ramp ink terang netral |
| `--ink` / `--ink-2` / `--ink-3` | `#111827` / `#4b5565` / `#5f6878` | tiga peran teks; redup 5,2:1 pada latar |
| `--accent` | `#2347c5` kobalt | tombol Cari, fokus, batang kode cacat, tautan umpan |
| status | hijau `#14532d` pada `#e7f5ec`, merah `#8f1717` pada `#fbe9e9` | stiker dan chip; kontras ≥ 7,5:1 |
| huruf | Public Sans 400/500/600, Red Hat Mono 400/500 | antarmuka; nomor seri, kode, angka |
| radius | 6 / 8 / 10 / 14 / 16 px | chip / tombol / input / panel / blok cari |

Kontras diukur dengan `contrast-check.py`: teks redup pada latar 5,23:1, pada kartu 5,62:1; teks tombol pada
kobalt 7,37:1.

## Keputusan

- Warna status hanya pada stiker, titik stasiun, dan chip; kerangka tetap netral.
- Angka "Unit ditahan" merah hanya bila lebih dari 0.
- Umpan kejadian dan pintasan memakai tombol sehingga bisa dijangkau keyboard.
- Gerak: hanya transisi warna 160 ms; stiker tidak miring bila `prefers-reduced-motion`.
- sloplint: 0 FAIL.
