# Daftar titik · Laporan Kepatuhan Mutu

Sensor yang menentukan kepatuhan setiap area. Satu area dinyatakan **dalam syarat** pada suatu detik bila semua
sensornya berada di dalam batas. Batas di bawah ini adalah **data contoh** dari `db/init/02-seed.sql`; batas
resmi harus diambil dari spesifikasi proses klien `[REAL DATA: spesifikasi lingkungan per area]`.

| Tag | Area | Besaran | Satuan | Batas bawah | Batas atas | Interval baca (asumsi) |
|---|---|---|---|---|---|---|
| TH-SMT1-01 | SMT Line 1 | suhu | °C | 22 | 26 | 5 dtk |
| TH-SMT1-02 | SMT Line 1 | kelembapan | %RH | 40 | 60 | 5 dtk |
| PC-L1 | SMT Line 1 | partikel ≥ 0,5 µm | per m³ | | 352.000 | 60 dtk |
| TH-SMT2-01 | SMT Line 2 | suhu | °C | 22 | 26 | 5 dtk |
| TH-SMT2-02 | SMT Line 2 | kelembapan | %RH | 40 | 60 | 5 dtk |
| TH-TV-01 | Perakitan TV | suhu | °C | 22 | 28 | 5 dtk |
| TH-TV-02 | Perakitan TV | kelembapan | %RH | 30 | 65 | 5 dtk |
| TH-PK-01 | Perakitan kulkas | suhu | °C | 20 | 30 | 5 dtk |
| VB-K02 | Kompresor & utilitas | getaran | mm/s | | 4,5 | 5 dtk |
| PT-UDARA | Kompresor & utilitas | tekanan udara tekan | bar | 6 | 8 | 5 dtk |
| TH-GD-01 | Gudang komponen | suhu | °C | 18 | 30 | 60 dtk |
| DC-01 | Gudang komponen | kelembapan dry cabinet | %RH | | 5 | 60 dtk |
| TS-CSB-01 | Cold storage B | suhu | °C | 2 | 10 | 60 dtk |
| TS-SRV-01 | Ruang server | suhu | °C | 18 | 27 | 60 dtk |

## Indikator turunan

| Indikator | Rumus | Ambang | Tempat diatur |
|---|---|---|---|
| Persen waktu dalam syarat (harian) | `detik_sesuai / detik_total × 100` | ≥ 99,0 % | `AMBANG_PERSEN` di `.env` |
| Persen periode | `Σ detik_sesuai / Σ detik_total` | ≥ 99,0 % | sama |
| Penanda kritis di lembar | persen harian < 95,0 % | | `web/app.js` |

## Profil simulator

Peluang ekskursi per jam dan durasinya (menit) yang dipakai `simulator/simulator.py`:

| Area | Peluang/jam | Durasi |
|---|---|---|
| SMT Line 1 | 0,02 | 3 sampai 15 |
| SMT Line 2 | 0,03 | 5 sampai 30 (sedang menyimpang 30 menit saat start) |
| Perakitan TV | 0,005 | 3 sampai 10 |
| Perakitan kulkas | 0,01 | 3 sampai 12 |
| Kompresor & utilitas | 0,04 | 10 sampai 40 |
| Gudang komponen | 0,003 | 5 sampai 20 |
| Cold storage B | 0,015 | 5 sampai 25 |
| Ruang server | 0,002 | 2 sampai 8 |
