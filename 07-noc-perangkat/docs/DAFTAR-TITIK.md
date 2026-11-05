# Daftar titik · NOC Perangkat & Gateway

Proyek ini memantau **kesehatan perangkat**, bukan nilai proses. Setiap titik di bawah adalah metrik kesehatan
yang wajib diekspos oleh gateway atau exporter di lapangan. Semua angka ambang adalah usulan awal
`[REAL DATA: SOP pemeliharaan klien]`.

## Gateway

| Gateway | Area | Protokol | Jumlah sensor | Interval baca |
|---|---|---|---|---|
| GW-L1 | SMT Line 1 | Modbus RTU (RS485) | 64 | 5 dtk |
| GW-L2 | SMT Line 2 | Modbus RTU (RS485) | 71 | 5 dtk |
| GW-PR | Perakitan TV & kulkas | Modbus RTU (RS485) | 88 | 5 dtk |
| GW-UT | Kompresor & utilitas | Modbus TCP | 52 | 5 dtk |
| GW-GD | Gudang | Modbus TCP | 17 | 5 dtk |
| LoRa | Nirkabel seluruh pabrik | LoRaWAN | 126 | 60 dtk |

## Titik kesehatan

| Tag metrik | Nama | Berlaku untuk | Satuan | Rentang | Peringatan | Kritis | Sumber |
|---|---|---|---|---|---|---|---|
| `noc_gateway_up` | Gateway terhubung | gateway | 0/1 | 0 sampai 1 | | = 0 selama 2 mnt | ping/heartbeat gateway |
| `noc_gateway_uptime_seconds` | Uptime gateway | gateway | detik | ≥ 0 | restart < 1 jam (informasi) | | register status gateway |
| `noc_sensor_last_seen_timestamp_seconds` | Data terakhir | semua sensor | waktu Unix | | | umur > 300 dtk selama 1 mnt | gateway / network server |
| `noc_sensor_battery_percent` | Sisa baterai | LoRa | % | 0 sampai 100 | < 20 selama 10 mnt | < 5 (dugaan baterai habis) | payload uplink LoRa |
| `noc_sensor_rssi_dbm` | Kuat sinyal | LoRa | dBm | -130 sampai -30 | < -115 (usulan, belum dialertkan) | | metadata uplink |
| `noc_sensor_crc_errors_total` | Galat CRC/timeout | Modbus | frame | counter | laju > 0,05/dtk selama 5 mnt | | statistik master Modbus |
| `noc_sensor_info{firmware}` | Versi firmware | semua sensor | teks | | ≠ `noc_firmware_latest_info` | | register versi perangkat |

## Skenario data contoh

Simulator menghasilkan kondisi berikut, relatif terhadap waktu start pertama stack:

| Kejadian | Waktu | Dampak |
|---|---|---|
| GW-GD putus jaringan | 8 jam 20 mnt sebelum start | 17 sensor gudang tidak mengirim data |
| GW-L2 restart | 11 jam sebelum start, 10 mnt | 71 sensor hilang sesaat |
| Kabel RS485 VB-CV-TV bermasalah | 2 jam sebelum start | galat CRC naik terus, sensor tidak mengirim data |
| Baterai TH-PK-14 habis | 45 mnt sebelum start | sensor nirkabel hilang |
| 8 sensor LoRa lain | | baterai 8 sampai 19 % |
| 5 sensor | | firmware 2.3.8 atau 2.4.0, terbaru 2.4.1 |
