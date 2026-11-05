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
(stasiun, pukul, kode cacat, catatan) dan stiker merah pada garis waktu. Putaran 2: yang paling menonjol kini
label nomor seri dan garis waktu unit, bukan kolom cari; cari menjadi satu baris alat di bawah header.

## Tata letak

- Header tinta gelap; di bawahnya baris cari (label, kolom mono 18 px, tombol Cari, pintasan unit ditahan).
- Pita putih penuh lebar (tanpa kolom tengah): label nomor seri bergaya stiker di kiri (model, nomor seri mono
  44 px, kode batang, potongan sobek berperforasi berisi status), kalimat temuan 22 px di kanan, lalu garis waktu
  empat stasiun selebar layar dengan rel tebal yang terisi sampai stasiun terakhir yang dicapai, lalu catatan QC.
- Di bawah pita: lembar arsip tiga lajur dipisah garis (Hari ini, kode cacat 7 hari, umpan kejadian), bukan kartu.
- Di bawah 1200 px lembar arsip dua lajur; di bawah 900 px semua satu kolom dan label menumpuk potongannya.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` / `--sheet` | `#e9ebef` / `#ffffff` / `#eceff4` / `#f7f8fa` | latar abu bodi unit, pita putih, lembar arsip |
| `--ink` / `--ink-2` / `--ink-3` | `#111827` / `#4b5565` / `#5a6372` | tiga peran teks; redup 5,08:1 pada latar, 5,71:1 pada lembar |
| `--on-ink-2` / `--on-ink-line` | `#c9ced8` / putih 45 % | teks redup dan garis di header tinta (11,24:1) |
| `--chart-fs` / `--tepi` | 13 px / 40 px | teks grafik / tepi kiri-kanan halaman |
| `--accent` | `#2347c5` kobalt | tombol Cari, fokus, batang kode cacat, tautan umpan |
| status | hijau `#14532d` pada `#e7f5ec`, merah `#8f1717` pada `#fbe9e9` | stiker dan chip; kontras ≥ 7,5:1 |
| huruf | Public Sans 400/500/600, Red Hat Mono 400/500 | antarmuka; nomor seri, kode, angka |
| radius | 0 kecuali 6 / 8 px | permukaan dan kontrol siku; radius hanya di label nomor seri, stiker, dan slot stiker |

Kontras diukur dengan `contrast-check.py`: teks redup pada latar 5,08:1, pada lembar 5,71:1; teks tombol pada
kobalt 7,37:1.

## Keputusan

- Warna status hanya pada stiker, titik stasiun, dan chip; kerangka tetap netral.
- Angka "Unit ditahan" merah hanya bila lebih dari 0.
- Umpan kejadian dan pintasan memakai tombol sehingga bisa dijangkau keyboard.
- Gerak: hanya transisi warna 160 ms; stiker tidak miring bila `prefers-reduced-motion`.
- sloplint: 0 FAIL.
- Putaran 2 (keluar dari rumpun "SaaS putih"): struktur permukaan berganti dari kartu putih membulat menjadi pita
  penuh lebar dan lembar arsip bergaris; sudut siku; skala tipe naik (isi 15 px, stasiun 22 px, nomor seri 44 px,
  angka hari ini 36 px).
- Putaran 2: kode batang pada label dibangkitkan dari karakter nomor seri sebagai hiasan (`aria-hidden`), bukan
  simbologi yang bisa dipindai; nomor seri tetap tercetak sebagai teks.
- Putaran 2: stasiun yang belum dicapai menampilkan slot stiker kosong bergaris putus, supaya kolom tidak kosong.
- Putaran 2: tepat satu penanda `data-pratinjau` di header; di mode pratinjau status koneksi disembunyikan.
