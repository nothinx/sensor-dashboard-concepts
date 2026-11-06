# Desain · IPAL & Emisi Lingkungan

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Petugas HSE menjaga air limbah yang keluar dari IPAL tetap di bawah baku mutu dan siap dilaporkan.
- **Karakter.** Tenang, bertanggung jawab, membumi.
- **Dunia.** Kolam pengolahan, botol sampel air berlabel, dokumen izin lingkungan.
- **Momen.** Grafik besar satu parameter outlet terhadap garis baku mutu, dengan penanda kapan nilai mulai melewati batas.
- **Tanda tangan.** Penanda titik sampling S1 sampai S4 berbentuk lingkaran berlabel, dipakai di alur proses dan
  di tabel. S4 diisi penuh karena satu-satunya titik yang dinilai baku mutunya.

## Pertanyaan layar

"Apakah air yang keluar hari ini masih di bawah baku mutu?" Jawaban ada di kalimat temuan di bawah judul
(parameter, nilai, batas, sejak pukul berapa) dan grafik utama otomatis membuka parameter yang sedang melewati batas.

## Tata letak

Bilah atas dengan garis aturan ganda (kepala dokumen); judul serif 52 px dengan temuan 20 px di sampingnya;
alur S1 → S4 sebagai skema berpipa selebar layar: empat kolam berisi air, pipa tebal dengan panah alir, titik
sampling di pipa keluar tiap kolam, dan label botol sampel (kode, jam sampel, COD/TSS/amonia 22 px) di bawahnya.
Di bawahnya satu lembar dokumen menyatu tanpa celah: grafik utama (fluid, tinggi 400 px, nilai sekarang 44 px di
kepala panel) di samping kolom 480 px berisi kejadian dan pengiriman; tabel nilai terakhir dan hasil lab selebar
lembar. Kanvas dipakai penuh (tanpa batas lebar). Di HP alur menjadi pipa tegak dengan label botol bertumpuk.

## Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | `#eef0e8` / `#fbfbf7` / `#e4e7dc` | permukaan netral, sedikit kehijauan |
| `--ink` / `--ink-2` / `--ink-3` | `#171a15` / `#464c41` / `#5e6458` | tiga peran teks (`--ink-3` 5,3:1 pada latar, 4,9:1 pada `--moss-soft`) |
| `--moss` | `#4a6627` | aksen tunggal: garis grafik, penanda titik, tab aktif (5,5:1 pada `--moss-soft`) |
| `--moss-soft` | `#e7eddc` | latar penanda dan baris outlet |
| `--crit` | `#c23a33` | garis baku mutu dan nilai yang melewati |
| `--line` / `--rule` | `#d6d9cd` / `#171a15` | garis halus dalam lembar / garis aturan tinta antarbagian |
| `--water` / `--pipe` | `#d5e2d9` / `#7b8273` | air kolam (teks `--ink-2` 6,6:1) / pipa alur |
| radius `--r` | lembar 0; label botol, tombol, chip, pita 4 px; penanda bulat | dua radius saja; semua garis 1 px kecuali pipa/kolam (ilustrasi) |
| skala tipe `--fs-1..7` | 13 / 15 / 17 / 21 / 28 / 40 / 56 px (HP: 13 / 14 / 16 / 18 / 24 / 32 / 36) | catatan, sumbu, chip / label, kepala tabel / isi, sel / temuan, judul panel / nilai label botol / nilai sekarang / judul halaman. Satu-satunya tempat `font-size` ditulis |
| jarak `--sp-1..9` | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 px | tepi luar `--gut` 40 (HP 16), padding panel `--pad` 24 (HP 16) |
| line-height | isi 1,5; judul 1,05 sampai 1,25; angka besar 1,0 | letter-spacing hanya di h1 (-0,02em) |

Huruf: **Fraunces** untuk judul halaman dan nama produk (rasa dokumen lingkungan yang tenang),
**Public Sans** (400/500/600) untuk antarmuka dan semua angka. Tanpa mono.

## Keputusan

- Warna merah hanya untuk baku mutu dan nilai yang melewatinya. Lumut untuk data, bukan untuk status baik.
- Status baku mutu hanya di S4; titik lain bertuliskan "dipantau" supaya tidak memberi kesan pelanggaran di
  tahap proses yang memang belum bersih.
- Baku mutu dan format pelaporan ditandai `[REAL DATA]` di layar, tidak disembunyikan.
- Putaran 2: permukaan diganti dari kartu putih bersudut 14 px menjadi lembar dokumen menyatu bergaris aturan
  tinta, supaya tidak tertukar dengan rumpun "SaaS putih".
- Zona di atas baku mutu pada grafik diarsir merah tipis (pola SVG di `app.js`, skala mengikuti `lineChart`).
- Angka besar di kepala grafik memakai nilai S4 yang sama dengan kalimat temuan (satu angka satu tempat).
- Tepat satu penanda `data-pratinjau` di bilah atas; di pratinjau teks status koneksi disembunyikan.
- Kontras baru: `--ink-3` pada latar/lembar/`--raised` 5,3 / 5,9 / 4,9 : 1; `--crit-ink` pada lembar 8,4 : 1.
- Kunci API tidak pernah berada di peramban; dasbor hanya bicara dengan nginx satu origin.
- Putaran 3, huruf: Instrument Sans + Geist Mono diganti **Public Sans**. Instrument Sans sempit dan x-height-nya
  kecil sehingga melelahkan di 13 sampai 15 px; Geist Mono membuat angka dan jam ("6 , 3", "14.31") lebar dan
  berjarak. Public Sans (huruf layanan publik, rasa dokumen resmi) punya x-height lega dan angka tabular yang
  rapi. Tabular hanya untuk angka yang dibandingkan (tabel, label botol, kepala grafik, log); angka di kalimat
  tetap proporsional. Satuan selalu lebih kecil dan redup, dipisah spasi tipis.
- Putaran 3, tata letak: segmen parameter turun ke baris sendiri di bawah judul grafik; kepala grafik jadi dua
  angka berlabel ("Sekarang", "Baku mutu") dipisah garis 1 px. Tinggi grafik dihitung JS (`tinggiGrafik`)
  supaya lembar kiri sejajar dengan kolom kejadian dan pengiriman (tanpa ruang kosong). Kolom kanan
  `clamp(400px, 28vw, 520px)`. Label baku mutu di grafik dipindah ke kiri agar tak menabrak nilai terbaru.
- Putaran 3, bahasa: satu istilah "di atas baku mutu" untuk nilai yang melewati; nama parameter pendek
  ("Amonia") di tombol, tabel, dan kejadian, nama lengkap "Amonia (NH₃-N)" hanya di kalimat temuan; kalimat
  aktif dan lengkap di kejadian ("Sejak pukul 14.01, sudah 31 menit."); satuan tabel di baris kedua kepala
  kolom, bukan dalam kurung ganda; tanggal lab lengkap dengan tahun.
- Garis kiri pada kalimat temuan (merah saat melewati, lumut saat aman) sengaja dipertahankan: penanda status
  temuan, bukan hiasan. Sloplint menandainya WARN.
