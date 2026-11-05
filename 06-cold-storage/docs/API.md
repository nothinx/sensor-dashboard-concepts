# Antarmuka data: MQTT dan REST

Ada dua jalur: **MQTT** untuk nilai langsung (sensor → broker → dasbor/bridge) dan **REST** untuk
data awal serta riwayat dari Redis. Waktu dalam milidetik epoch (UTC).

## MQTT

Broker Mosquitto 2.0. TCP `localhost:18061`, WebSocket `ws://localhost:18062`.

| Topik | Retained | Payload | Penerbit |
|---|---|---|---|
| `gudang/{ruang}/suhu` | ya | `{"ts": 1793853804026, "v": 4.27}` | sensor/simulator |
| `gudang/{ruang}/rh` | ya | `{"ts": ..., "v": 2.31}` | sensor/simulator |
| `gudang/{ruang}/pintu` | ya | `{"ts": ..., "terbuka": true, "sejak": 1793853600000}` | sensor/simulator |
| `riwayat/{ruang}/{metrik}` | tidak | `{"ts": ..., "v": ...}` | simulator (isi riwayat saat start) |

- `{ruang}` sesuai `id` di `db/ruang.json` (mis. `cs-b`, `dc-05`, `gd-umum`).
- QoS 1. Pesan *retained* membuat klien baru langsung menerima nilai terakhir tanpa menunggu.
- `sejak` = waktu pintu mulai terbuka (saat tertutup berisi waktu pesan).

Hak akses (`mosquitto/acl`):

| Klien | Baca | Tulis |
|---|---|---|
| anonim (dasbor, bridge) | `gudang/#`, `riwayat/#` | tidak boleh |
| pengguna `sensor` | `gudang/#`, `riwayat/#` | `gudang/#`, `riwayat/#` |

```bash
docker exec konsep-06-mosquitto-1 mosquitto_sub -h localhost -t 'gudang/cs-b/#' -v
```

## REST

Basis URL `http://localhost:18060/api`. Galat: `{"galat": "<penyebab dan langkah>"}`.
CORS hanya untuk `CORS_ORIGIN`. `Cache-Control: no-store`.

| Metode | Jalur | Fungsi |
|---|---|---|
| GET | `/health` | Cek API dan Redis |
| GET | `/ruang` | Konfigurasi + nilai terkini semua ruang |
| GET | `/riwayat` | Deret waktu satu ruang/metrik dari Redis Streams |

### GET /ruang

```json
{
  "ts": 1793853805320,
  "ruang": [
    {
      "id": "cs-b", "nama": "Cold storage B", "jenis": "dingin", "isi": "Pasta solder cadangan, lem SMT", "setpoint": 4.0,
      "metrik": { "suhu": { "w": [2, 10], "k": [0, 12], "satuan": "°C" } },
      "pintu": { "batas_detik": 300 },
      "nilai": { "suhu": 5.54 },
      "ts": { "suhu": 1793853804026 },
      "pintu_status": { "terbuka": true, "sejak": 1793853600000 }
    },
    { "id": "dc-09", "nama": "Lemari kering DC-09", "jenis": "lemari_kering", "nilai": {}, "ts": {}, "pintu_status": null }
  ]
}
```
Ruang yang belum pernah mengirim data punya `nilai` dan `ts` kosong; dasbor menampilkannya sebagai offline.

### GET /riwayat

| Parameter | Wajib | Aturan |
|---|---|---|
| `ruang` | ya | `id` di `db/ruang.json` |
| `metrik` | ya | metrik milik ruang itu (`suhu` atau `rh`) |
| `jam` | tidak (24) | 1 sampai 168 |
| `langkah` | tidak (15) | 1, 5, 15, atau 60 menit |

```bash
curl "localhost:18060/api/riwayat?ruang=cs-b&metrik=suhu&jam=2&langkah=15"
```
```json
{ "ruang": "cs-b", "metrik": "suhu", "langkah_menit": 15,
  "deret": [ { "ts": 1793846700000, "v": 4.2 }, { "ts": 1793847600000, "v": 4.43 } ] }
```

| Kode | Kapan |
|---|---|
| 400 | ruang/metrik tidak dikenal, `jam`/`langkah` di luar aturan atau bukan bilangan bulat |
| 404 | jalur `/api/...` lain |
| 503 | Redis tidak dapat dihubungi |

## Variabel lingkungan

| Nama | Dipakai | Bawaan |
|---|---|---|
| `REDIS_HOST`, `REDIS_PASSWORD` | bridge, api | `redis`, (wajib di `.env`) |
| `MQTT_HOST` | bridge, simulator | `mosquitto` |
| `MQTT_USER`, `MQTT_PASSWORD` | simulator, broker | dari `MQTT_SENSOR_*` |
| `RUANG_JSON` | semua | `/app/db/ruang.json` |
| `CORS_ORIGIN` | api | `http://localhost:18060` |
| `SIM_INTERVAL` | simulator | `5` detik |
