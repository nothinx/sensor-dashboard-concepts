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

Bilah atas dengan tab bagian; judul serif besar; alur S1 → S4 sebagai pita empat kolom; grafik utama (fluid) di
samping kolom 400 px berisi kejadian dan status pengiriman; tabel nilai terakhir per titik dan hasil lab di bawah.

## Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | `#f5f6f3` / `#ffffff` / `#eceeea` | permukaan netral, sedikit kehijauan |
| `--ink` / `--ink-2` / `--ink-3` | `#171a15` / `#4d5348` / `#676d61` | tiga peran teks (redup 4,9:1 pada latar) |
| `--moss` | `#4a6627` | aksen tunggal: garis grafik, penanda titik, tab aktif (5,5:1 pada `--moss-soft`) |
| `--moss-soft` | `#e7eddc` | latar penanda dan baris outlet |
| `--crit` | `#c23a33` | garis baku mutu dan nilai yang melewati |
| radius | kartu 14 px, kontrol 8 px, penanda bulat | |

Huruf: **Fraunces** untuk judul halaman dan nama produk (rasa dokumen lingkungan yang tenang),
**Instrument Sans** untuk antarmuka, **Geist Mono** untuk angka dan kode titik.

## Keputusan

- Warna merah hanya untuk baku mutu dan nilai yang melewatinya. Lumut untuk data, bukan untuk status baik.
- Status baku mutu hanya di S4; titik lain bertuliskan "dipantau" supaya tidak memberi kesan pelanggaran di
  tahap proses yang memang belum bersih.
- Baku mutu dan format pelaporan ditandai `[REAL DATA]` di layar, tidak disembunyikan.
- Kunci API tidak pernah berada di peramban; dasbor hanya bicara dengan nginx satu origin.
