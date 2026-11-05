# Daftar titik sensor

Sumber kebenaran: koleksi `titik` (diisi `db/init/01-skema.js`). Semua ambang adalah **contoh**;
ganti sesuai prosedur mutu klien `[REAL DATA: kelas ruang bersih, ambang lingkungan, prosedur ESD]`.
Interval baca simulator 5 detik. Peringatan = batas `w`, kritis = batas `k`.

| Tag | Nama | Ruang | Jenis | Metrik | Satuan | Peringatan | Kritis |
|---|---|---|---|---|---|---|---|
| TH-SMT-01 | Suhu & RH SMT barat | Ruang SMT | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 22–26 / 40–60 | di luar 20–28 / 35–65 |
| TH-SMT-02 | Suhu & RH SMT timur | Ruang SMT | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 22–26 / 40–60 | di luar 20–28 / 35–65 |
| PC-SMT-01 | Penghitung partikel SMT | Ruang SMT | Partikel | p05 (≥ 0,5 µm) | partikel/m³ | > 300.000 | > 352.000 (contoh: batas ISO 14644-1 kelas 7) |
| ESD-SMT-01 | Stasiun uji gelang SMT | Ruang SMT | Uji gelang ESD | mohm | MΩ | uji gagal | - |
| TH-TV-01 | Suhu & RH perakitan TV | Perakitan TV | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 22–27 / 40–65 | di luar 20–29 / 35–70 |
| ION-TV-01 | Ionizer meja 2 | Perakitan TV | Ionizer | offset / luruh | V / s | offset di luar ±35; luruh > 5 | offset di luar ±50; luruh > 8 |
| ION-TV-03 | Ionizer meja 7 | Perakitan TV | Ionizer | offset / luruh | V / s | offset di luar ±35; luruh > 5 | offset di luar ±50; luruh > 8 |
| ESD-TV-01 | Stasiun uji gelang TV | Perakitan TV | Uji gelang ESD | mohm | MΩ | uji gagal | - |
| TH-QC-01 | Suhu & RH QC | Uji akhir (QC) | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 22–27 / 40–65 | di luar 20–29 / 35–70 |
| ESD-QC-01 | Stasiun uji gelang QC | Uji akhir (QC) | Uji gelang ESD | mohm | MΩ | uji gagal | - |
| TH-PK-01 | Suhu & RH kulkas barat | Perakitan kulkas | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 20–30 / 30–70 | di luar 18–32 / 25–75 |
| TH-PK-02 | Suhu & RH kulkas timur | Perakitan kulkas | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 20–30 / 30–70 | di luar 18–32 / 25–75 |
| DP-AL-01 | Beda tekanan airlock | Airlock & ruang ganti | Beda tekanan | dp | Pa | < 10 | < 5 |
| TH-GD-01 | Suhu & RH gudang rak A | Gudang komponen ESD | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 18–28 / 30–60 | di luar 16–30 / 25–65 |
| TH-GD-08 | Suhu & RH gudang rak C | Gudang komponen ESD | Suhu & kelembapan | suhu / rh | °C / %RH | di luar 18–28 / 30–60 | di luar 16–30 / 25–65 |

## Uji gelang ESD

Stasiun mencatat resistansi sistem gelang + operator. Rentang lulus contoh 0,75 sampai 35 MΩ;
di luar rentang itu hasilnya `gagal`. Operator dicatat sebagai ID anonim (`OP-017`), bukan nama.

## Skenario simulator

| Titik | Perilaku |
|---|---|
| ION-TV-03 | Offset ±38 V (peringatan), luruh ±4,2 detik |
| TH-SMT-01/02 | RH turun ke ±42,5 % pukul 05.30 sampai 08.30 (masih di atas batas 40) |
| PC-SMT-01 | Lonjakan +60.000 partikel/m³ di sekitar pergantian shift (06.00, 14.00, 22.00) |
| TH-GD-08 | Berhenti mengirim data 6 jam sebelum simulator mulai (offline) |
| Stasiun ESD | Satu uji setiap ±30 detik di stasiun acak, ±1,2 % gagal |
