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

- Header tinta gelap; di bawahnya baris cari (label, kolom mono 17 px setinggi tombol Cari 44 px, dua kelompok
  pintasan: "Sedang ditahan" dan "Baru diperbaiki").
- Satu kisi empat lajur (celah 32 px) untuk seluruh halaman: label nomor seri di lajur 1-2, kalimat temuan 20 px
  mulai lajur 3 (maks 52ch), garis waktu empat stasiun satu per lajur, catatan QC (stasiun dan waktu di lajur 1,
  teks mulai lajur 2), lembar arsip (Hari ini lajur 1, Kode cacat terbanyak lajur 2-3, Kejadian terbaru lajur 4).
- Pita putih penuh lebar (tanpa kolom tengah); lembar arsip bergaris di bawahnya, garis pemisah lajur di tengah celah.
- Di bawah 1200 px label dan temuan menumpuk, lembar arsip dua lajur; di bawah 900 px semua satu kolom, label
  menumpuk potongannya, pintasan per kelompok.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` / `--sheet` | `#e9ebef` / `#fcfcfd` / `#eceff4` / `#f7f8fa` | latar abu bodi unit, pita putih, lembar arsip |
| `--ink` / `--ink-2` / `--ink-3` | `#111827` / `#4b5565` / `#5a6372` | tiga peran teks; redup 5,08:1 pada latar, 5,71:1 pada lembar |
| `--on-ink-2` / `--on-ink-line` | `#c9ced8` / putih 45 % | teks redup dan garis di header tinta (11,24:1) |
| `--fs-1`..`--fs-6` | 13 / 15 / 17 / 20 / 28 / 40 px (HP: 20→18, 28→24, 40→28) | label & chip / isi / judul bagian & kolom cari / stasiun & temuan / angka hari ini / nomor seri |
| `--lh-isi` / `--lh-judul` / `--lh-angka` | 1,5 / 1,2 / 1 | isi / judul / angka besar |
| `--sp-1`..`--sp-7` | 4 / 8 / 12 / 16 / 24 / 32 / 48 px | semua jarak |
| `--tepi` / `--celah` / `--kontrol` | 40 px (HP 16) / 32 px / 44 px | tepi halaman / celah kisi / tinggi kolom cari dan tombol |
| `--chart-fs` `--st-fs` `--tip-fs` / `--chart-font` | `--fs-1` / sans | teks chip status dan grafik bersama |
| `--accent` | `#2347c5` kobalt | tombol Cari, fokus, batang kode cacat, tautan umpan |
| status | hijau `#14532d` pada `#e7f5ec`, merah `#8f1717` pada `#fbe9e9` | stiker dan chip; kontras ≥ 7,5:1 |
| huruf | Golos Text 400/500/600, Atkinson Hyperlegible Mono 400/500 | antarmuka dan semua angka; mono hanya nomor seri, kode cacat, kode operator/stasiun |
| `--r-label` / `--garis-label` | 8 px / 1,5 px | satu radius dan satu tebal tepi, hanya benda bergaya stiker (label, stiker, slot); permukaan dan kontrol siku, garis struktur 1 px |

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
- Putaran 3 (keterbacaan): Public Sans + Red Hat Mono diganti Golos Text + Atkinson Hyperlegible Mono. Golos Text
  dibuat untuk antarmuka layanan publik (garis keturunan yang sama dengan Public Sans), x-height 0,53 em, punya
  `tnum`; Atkinson Hyperlegible Mono membedakan 0/O dan 1/I/l, penting untuk nomor seri yang dibaca per karakter.
- Putaran 3: satu skala tipe enam langkah di `:root`; tak ada ukuran px di selektor lain. Letter-spacing negatif
  hanya di angka 28 px (-0,01em). Angka (waktu, KPI, besaran uji, jumlah cacat) memakai sans tabular, bukan mono;
  satuan lebih kecil dan redup, dipisah spasi tipis (`71,4 W`).
- Putaran 3: catatan QC dan lembar arsip ikut kisi empat lajur garis waktu, sehingga tepi kiri semua blok sejajar.
- Putaran 3 (bahasa): "Umpan kejadian, dari change stream koleksi unit" menjadi "Kejadian terbaru"; label KPI
  tanpa "hari ini" berulang; "2 dari 4 stasiun" menjadi "Stasiun 2 dari 4"; kalimat temuan menyebut "kode cacat";
  pesan galat memuat sebab dan langkah berikut.
- Putaran 3: render tiruan HP dibuat lewat iframe 390 px, karena jendela Chrome headless di Windows tidak bisa
  lebih sempit dari sekitar 500 px.
