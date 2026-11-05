# API · NOC Perangkat & Gateway

Dasbor tidak memiliki backend sendiri. Data ditarik langsung dari **HTTP API Prometheus** (PromQL) lewat proxy
nginx pada origin yang sama, sehingga tidak perlu CORS.

- Basis URL: `http://localhost:18070/prom/api/v1`
- Metode: hanya `GET`
- Format jawaban: JSON Prometheus (`status`, `data`); dokumentasi resmi di
  <https://prometheus.io/docs/prometheus/latest/querying/api/>
- Interval tarik dasbor: 15 detik (sama dengan `scrape_interval`)

| Endpoint proxy | Diteruskan ke | Dipakai untuk |
|---|---|---|
| `/prom/api/v1/query` | `prometheus:9090/api/v1/query` | nilai terkini |
| `/prom/api/v1/query_range` | `.../query_range` | grafik 24 jam |
| `/prom/api/v1/alerts` | `.../alerts` | daftar alert aktif |
| `/prom/api/v1/rules` | `.../rules` | daftar aturan (cadangan, belum dipakai UI) |
| endpoint lain di `/prom/` | ditolak `404` | |

## Query yang dipakai dasbor

| Panel | PromQL |
|---|---|
| Identitas gateway | `noc_gateway_info` |
| Status gateway | `noc_gateway_up`, `noc_gateway_uptime_seconds` |
| Daftar sensor | `noc_sensor_info` (label `sensor`, `gateway`, `type`, `location`, `firmware`) |
| Umur data terakhir | `time() - noc_sensor_last_seen_timestamp_seconds` |
| Baterai | `noc_sensor_battery_percent` |
| Galat CRC | `rate(noc_sensor_crc_errors_total[5m])` |
| Versi firmware terbaru | `noc_firmware_latest_info` |
| Riwayat 24 jam | `sum(max by (gateway) (noc_gateway_sensors_online))`, step 300 detik |

`max by (gateway)` menyatukan seri hasil backfill dan seri live bila labelnya berbeda, sehingga jumlah tidak
terhitung ganda.

## Contoh permintaan dan jawaban (diambil dari stack yang berjalan)

### Status satu gateway

```bash
curl -G http://localhost:18070/prom/api/v1/query --data-urlencode 'query=noc_gateway_up{gateway="GW-GD"}'
```

```json
{"status":"success","data":{"resultType":"vector","result":[{"metric":{"__name__":"noc_gateway_up","gateway":"GW-GD","instance":"exporter:9100","job":"noc-exporter"},"value":[1793853510.026,"0"]}]}}
```

### Umur data terakhir satu sensor (detik)

```bash
curl -G http://localhost:18070/prom/api/v1/query \
  --data-urlencode 'query=time() - noc_sensor_last_seen_timestamp_seconds{sensor="VB-CV-TV"}'
```

```json
{"status":"success","data":{"resultType":"vector","result":[{"metric":{"gateway":"GW-PR","instance":"exporter:9100","job":"noc-exporter","sensor":"VB-CV-TV"},"value":[1793853510.076,"7444.776000022888"]}]}}
```

### Jumlah sensor online, 15 menit terakhir

```bash
curl -G http://localhost:18070/prom/api/v1/query_range \
  --data-urlencode 'query=sum(max by (gateway) (noc_gateway_sensors_online))' \
  --data-urlencode start=1793852610 --data-urlencode end=1793853510 --data-urlencode step=300
```

```json
{"status":"success","data":{"resultType":"matrix","result":[{"metric":{},"values":[[1793852610,"399"],[1793852910,"399"],[1793853210,"399"],[1793853510,"399"]]}]}}
```

### Alert aktif (dipotong)

```json
{"status":"success","data":{"alerts":[{"labels":{"alertname":"GatewayPutus","gateway":"GW-GD","severity":"kritis"},
 "annotations":{"ringkasan":"Gateway GW-GD tidak terhubung ke kolektor","langkah":"Periksa catu daya dan kabel jaringan gateway, lalu status switch di rak."},
 "state":"firing","activeAt":"2026-11-05T04:34:46.807105477Z","value":"0e+00"}]}}
```

## Aturan alert (`db/rules/alerts.yml`)

| Alert | Ekspresi | Tunda | Tingkat |
|---|---|---|---|
| `GatewayPutus` | `noc_gateway_up == 0` | 2 mnt | kritis |
| `SensorTidakMengirim` | `time() - noc_sensor_last_seen_timestamp_seconds > 300 unless on(gateway) (noc_gateway_up == 0)` | 1 mnt | kritis |
| `BateraiRendah` | `noc_sensor_battery_percent < 20` | 10 mnt | peringatan |
| `GalatCRCBeruntun` | `rate(noc_sensor_crc_errors_total[5m]) > 0.05` | 5 mnt | peringatan |

`SensorTidakMengirim` sengaja tidak menyala untuk sensor di belakang gateway yang putus, supaya satu gangguan
gateway tidak menghasilkan belasan alert.

## Galat

| Kondisi | Jawaban | Perilaku dasbor |
|---|---|---|
| Prometheus mati atau belum siap | `502` dari nginx | pita "Mode data contoh" + sebab, coba lagi tiap 15 detik |
| PromQL salah | `400`, `status: "error"` | pesan galat Prometheus ditampilkan di pita |
| Dibuka sebagai file | tidak ada permintaan | data contoh bawaan |
