# Daftar titik sensor

Sumber kebenaran: `db/ruang.json`. Semua ambang adalah **contoh**:
`[REAL DATA: rentang simpan dari lembar data pasta solder/lem dan prosedur MSD klien]`.
Interval kirim simulator 5 detik. Peringatan = batas `w`, kritis = batas `k`.

| Tag | Nama | Isi | Metrik | Satuan | Normal (w) | Kritis bila | Batas pintu terbuka |
|---|---|---|---|---|---|---|---|
| cs-a | Cold storage A | Pasta solder lot berjalan | suhu | °C | 2 sampai 10 | < 0 atau > 12 | 300 detik |
| cs-b | Cold storage B | Pasta solder cadangan, lem SMT | suhu | °C | 2 sampai 10 | < 0 atau > 12 | 300 detik |
| fz-01 | Freezer lem epoksi | Lem epoksi, underfill | suhu | °C | -25 sampai -15 | < -30 atau > -12 | 120 detik |
| dc-01 | Lemari kering DC-01 | IC BGA, MCU (rak A) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| dc-02 | Lemari kering DC-02 | LED driver (rak A) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| dc-03 | Lemari kering DC-03 | Modul Wi-Fi (rak B) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| dc-05 | Lemari kering DC-05 | Reel sisa produksi (SMT Line 1) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| dc-06 | Lemari kering DC-06 | Reel sisa produksi (SMT Line 2) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| dc-09 | Lemari kering DC-09 | Panel LCD driver (rak C) | rh | %RH | ≤ 5 | > 10 | 60 detik |
| gd-umum | Gudang umum | Barang jadi dan kemasan | suhu / rh | °C / %RH | ≤ 32 / ≤ 70 | > 35 / > 80 | tanpa sensor pintu |

## Aturan status (di dasbor)

| Status | Kondisi |
|---|---|
| Normal | Semua metrik dalam batas `w`, pintu tertutup |
| Peringatan | Metrik di luar `w`, atau pintu terbuka belum melewati batas (hitung mundur berjalan) |
| Kritis | Metrik di luar `k`, atau pintu terbuka melewati batas |
| Offline | Tidak ada pesan nilai lebih dari 120 detik, atau belum pernah mengirim |

## Skenario simulator

| Ruang | Perilaku |
|---|---|
| cs-b | Pintu terbuka 7 menit setiap 20 menit (lewat batas 5 menit); suhu naik ±0,35 °C per menit selama terbuka |
| cs-a, fz-01 | Pintu terbuka 45 detik setiap 30 menit |
| dc-05 | RH dasar 4,4 % dan pintu sering dibuka (setiap 6 menit), dekat batas |
| dc-xx lain | RH dasar ±2,3 %, pintu terbuka 25 detik setiap 25 menit |
| dc-09 | Tidak pernah mengirim (contoh sensor offline) |
| gd-umum | Suhu 27 sampai 31 °C mengikuti siang/malam, RH 56 sampai 68 % |
