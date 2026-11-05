# Mockup dasbor pemantauan sensor untuk klien

Berisi 10 layar HTML statis untuk web desktop (1920×1080). Buka `01-ringkasan.html` di peramban; navigasi antarlayar ada di bagian atas.
Tombol "Tema" mengganti mode terang/gelap.

| No | Layar | Pertanyaan yang dijawab |
|---|---|---|
| 01 | Ringkasan | Apakah semua area dalam keadaan normal sekarang? |
| 02 | Alarm | Alarm apa yang harus ditangani, oleh siapa? |
| 03 | Detail sensor | Sejak kapan dan kenapa sensor ini keluar batas? |
| 04 | Lini SMT & reflow | Apakah profil suhu oven sesuai resep? |
| 05 | Energi listrik | Apakah beban masih di bawah batas kontrak, dan di mana pemakaian terbesar? |
| 06 | Getaran mesin | Mesin mana yang perlu perawatan sebelum rusak? |
| 07 | Ruang & ESD | Apakah ruang produksi memenuhi syarat suhu/RH/partikel/ESD? |
| 08 | Gudang & cold storage | Apakah pasta solder dan komponen peka kelembapan (MSD) tersimpan dengan benar? |
| 09 | Perangkat sensor | Sensor mana yang tidak mengirim data, dan kenapa? |
| 10 | Laporan | Berapa persen waktu tiap area memenuhi syarat; membuat dan mengunduh laporan |

## Yang perlu diisi dari klien
- Logo dan warna merek: ganti `[LOGO KLIEN]` dan `--accent` di `assets/app.css`.
- Semua angka, nama area, nama mesin, dan denah adalah **data contoh** dan ditandai di setiap layar.
- Placeholder `[REAL DATA: ...]`: nama resep reflow, tarif PLN, jadwal kalibrasi.

## Struktur
- `assets/app.css`: token warna (terang dan gelap) serta komponen.
- `assets/app.js`: navigasi, data contoh deterministik, grafik SVG dengan tooltip, tanpa pustaka tambahan.
