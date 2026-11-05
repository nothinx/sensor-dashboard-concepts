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
| `--bg` / `--surface` / `--raised` | `#f5f6f3` / `#ffffff` / `#eceeea` | permukaan netral, sedikit kehijauan |
| `--ink` / `--ink-2` / `--ink-3` | `#171a15` / `#4d5348` / `#676d61` | tiga peran teks (redup 4,9:1 pada latar) |
| `--moss` | `#4a6627` | aksen tunggal: garis grafik, penanda titik, tab aktif (5,5:1 pada `--moss-soft`) |
| `--moss-soft` | `#e7eddc` | latar penanda dan baris outlet |
| `--crit` | `#c23a33` | garis baku mutu dan nilai yang melewati |
| `--line` / `--rule` | `#cfd3c6` / `#171a15` | garis halus dalam lembar / garis aturan tinta antarbagian |
| `--water` / `--pipe` | `#d5e2d9` / `#7b8273` | air kolam (teks `--ink-2` 6,6:1) / pipa alur |
| radius | lembar 0, label botol 3 px, penanda bulat | lembar dokumen bersudut tegas, bukan kartu |
| skala tipe | 13 / 14 / 16 / 20 / 22 / 44 / 52 px | catatan / label / isi / temuan / judul panel / nilai sekarang / judul |

Huruf: **Fraunces** untuk judul halaman dan nama produk (rasa dokumen lingkungan yang tenang),
**Instrument Sans** untuk antarmuka, **Geist Mono** untuk angka dan kode titik.

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
