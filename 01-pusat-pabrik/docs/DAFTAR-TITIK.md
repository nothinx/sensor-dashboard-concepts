# Daftar titik · Pusat Pemantauan Pabrik

Semua titik di bawah adalah **data contoh** untuk mockup. Ganti dengan daftar titik asli dari klien
(`[REAL DATA: point list pabrik]`). Interval baca seluruh titik: 5 detik. Sumber di produksi: gateway
lapangan (Modbus/OPC UA) yang menulis ke tabel `reading`.

| Tag | Area | Nama | Jenis | Satuan | Peringatan bawah | Peringatan atas | Kritis bawah | Kritis atas |
|---|---|---|---|---|---|---|---|---|
| TH-SMT1-T | SMT Line 1 | Suhu ruang SMT Line 1 | room_temp | °C | 20 | 26 | 18 | 28 |
| TH-SMT1-H | SMT Line 1 | Kelembapan ruang SMT Line 1 | rh | %RH | 40 | 60 | 35 | 65 |
| TC-L1-Z6 | SMT Line 1 | Suhu oven zona 6 Line 1 | oven_temp | °C | 240 | 248 | 235 | 250 |
| TH-SMT2-T | SMT Line 2 | Suhu ruang SMT Line 2 | room_temp | °C | 20 | 26 | 18 | 28 |
| TH-SMT2-H | SMT Line 2 | Kelembapan ruang SMT Line 2 | rh | %RH | 40 | 60 | 35 | 65 |
| TC-L2-Z6 | SMT Line 2 | Suhu oven zona 6 Line 2 | oven_temp | °C | 240 | 248 | 235 | 250 |
| TH-TV-T | Perakitan TV | Suhu ruang perakitan TV | room_temp | °C | 20 | 27 | 18 | 29 |
| TH-PK-T | Perakitan kulkas | Suhu ruang perakitan kulkas | room_temp | °C | 20 | 28 | 18 | 30 |
| VB-K02 | Kompresor & utilitas | Getaran kompresor K-02 | vibration | mm/s | | 4,5 | | 7,1 |
| PT-UDARA | Kompresor & utilitas | Tekanan udara tekan | pressure | bar | 6,0 | | 5,5 | |
| TH-GD-T | Gudang komponen | Suhu gudang komponen | room_temp | °C | 18 | 30 | 15 | 32 |
| TH-GD-08 | Gudang komponen | Kelembapan gudang komponen | rh | %RH | 30 | 60 | 20 | 70 |
| TS-CSB | Cold storage B | Suhu cold storage B | cold_temp | °C | 2 | 8 | 0 | 10 |
| DS-CSB | Cold storage B | Pintu cold storage B terbuka | door_open | mnt | | 5 | | 15 |
| TH-QC-T | Uji akhir (QC) | Suhu ruang uji akhir | room_temp | °C | 20 | 26 | 18 | 28 |
| PM-MDP | Panel listrik utama | Beban listrik MDP | power | kW | | 1.500 | | 1.600 |
| TH-SRV-T | Ruang server | Suhu ruang server | room_temp | °C | 18 | 27 | 15 | 30 |

Aturan:
- Sensor tanpa pembacaan lebih dari **60 detik** dianggap offline. Offline tidak membuka alarm nilai,
  tetapi ditampilkan sebagai "Sebagian offline" di area dan berpola arsir di pita status.
- Alarm terbuka saat nilai melewati ambang dan tertutup otomatis saat nilai kembali di antara kedua
  ambang peringatan. Tunda alarm (deadband/delay) belum diterapkan; tambahkan bila sensor berderau.
- Batas kontrak 1.600 kW pada `PM-MDP` adalah contoh, `[REAL DATA: daya kontrak PLN]`.

Skenario simulator (agar mockup memperlihatkan semua keadaan):

| Titik | Perilaku |
|---|---|
| TC-L2-Z6 | Naik 7 °C dalam 40 menit sebelum simulator start, lalu bertahan di sekitar 252 °C (kritis) |
| VB-K02 | Mengikuti beban harian; di atas 4,5 mm/s pada jam kerja (peringatan) |
| DS-CSB, TS-CSB | Pintu terbuka 12 menit setiap 3 jam; suhu naik 0,22 °C per menit terbuka |
| TH-GD-08 | Berhenti mengirim 8 jam 22 menit sebelum start (gateway gudang putus) |
| PM-MDP | Beban harian 640 sampai sekitar 1.500 kW, puncak sekitar pukul 14.00 |
