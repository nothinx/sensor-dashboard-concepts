# Riwayat perubahan

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/). Semua tanggal dalam WIB.

## 6 November 2026

### Diubah (putaran 3: keterbacaan, bahasa, kerapian)
- Ke-15 situs dikerjakan ulang mengikuti `shared/BRIEF-PUTARAN-3.md`: font diganti bila kurang nyaman dibaca, satu
  skala tipe per situs (token `--fs-*` di `:root`), font mono hanya untuk kode/ID, angka sans tabular dengan
  satuan diredam, jarak `--sp-*` kelipatan 4, radius dan garis diseragamkan. Keputusan per situs dicatat di
  `NN-*/docs/DESAIN.md`.
- Bahasa seluruh teks UI dirapikan (EYD V, satu istilah per konsep): mis. "hisap" jadi "isap", "galat" jadi
  "kode gangguan", "Offline" jadi "Terputus", "mnt/dtk" ditulis lengkap, persen rapat ("100%").
- `shared/charts.js`: label sumbu Y memakai langkah bulat, label waktu jatuh di jam bulat, tooltip persen rapat,
  chip "Offline" jadi "Terputus". `shared/charts.css`: font, ukuran grafik, tooltip, dan chip bisa diatur per situs.
- Gambar kartu galeri `pratinjau/` diperbarui.

### Diperbaiki
- Data contoh 03 kini saling cocok (puncak, grafik, total per area). 11: tab tugas hilang di bingkai HP dan
  temuan "terlama" yang salah tugas. 14: kelas `.bawah` dobel yang merusak Lini 2.

## 5 November 2026

### Ditambahkan
- Draf awal 10 layar satu sistem dasbor (kemudian diarsipkan ke `_draf-10-layar/`).
- Sepuluh konsep dasbor terpisah (01 sampai 10), masing-masing dengan website, database, cara menarik data, simulator
  sensor, dan dokumentasi sendiri.
- Pustaka bersama `shared/charts.js` dan `shared/charts.css`: grafik SVG, chip status, format angka dan waktu
  Indonesia.
- Lima konsep berbasis database cloud (11 sampai 15): Firebase, Supabase, AWS DynamoDB, Azure Cosmos DB, MongoDB
  Atlas, diuji dengan emulator resmi.
- Mode `?pratinjau` dan galeri `pratinjau.html` untuk melihat ke-15 dasbor dengan data dummy tanpa instalasi.
- Data dummy lengkap untuk daftar laporan dan jejak audit di konsep 08.
- Dokumentasi lintas proyek di `docs/`: panduan, arsitektur, catatan proyek, kebutuhan data klien.
- Alat `shared/alat/kumpulkan_real_data.py` untuk menyusun daftar kebutuhan data klien.
- Repositori GitHub dan pratinjau online di Vercel (https://sensor-dashboard-concepts.vercel.app).

### Diubah
- Teks UI dan dokumentasi diselaraskan dengan EYD V: pukul `14.32`, koma desimal, titik ribuan, kalimat tidak
  diawali angka.
- README ke-15 konsep diseragamkan ke satu templat dan diposisikan sebagai pratinjau, bukan sistem produksi.
- Nama klien dihapus dari isi repo: teks memakai "klien", nama proyek compose dan ID teknis memakai awalan
  `konsep-` (sebelumnya nama klien). Volume Docker lama berawalan nama klien tidak dipakai lagi.
- Dasbor dengan `?pratinjau` tidak lagi mencoba menghubungi API (bendera `TANPA_API` di `shared/charts.js`),
  supaya situs statis tidak memicu permintaan gagal atau izin jaringan lokal di peramban.
- Putaran desain kedua untuk ke-15 dasbor berdasarkan kritik di `shared/BRIEF-PUTARAN-2.md`: arah lima baris
  unslop diwujudkan di lebih banyak permukaan, skala tipe untuk 1920×1080, kanvas dipakai penuh, dan rumpun
  kartu putih seragam dipecah. Keputusan per proyek tercatat di `docs/DESAIN.md` masing-masing.
- Label pratinjau melayang diganti satu penanda "Pratinjau, data contoh" di header tiap situs. Label ambang
  grafik diberi halo agar tidak tertimpa garis, dan label sumbu waktu menyesuaikan lebar grafik.
- Gambar kartu galeri `pratinjau/` diperbarui dari tampilan baru.

### Dihapus
- Salinan referensi `shared/_ref-app.*` (identik dengan arsip draf) dan folder tangkapan layar uji `.shot/`.
