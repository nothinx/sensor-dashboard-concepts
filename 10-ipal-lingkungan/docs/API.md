# API · IPAL & Emisi Lingkungan

REST JSON, PHP 8.3 + Slim 4. Spesifikasi mesin: [openapi.yaml](openapi.yaml).

- Basis URL langsung: `http://localhost:18102/api/v1` (wajib `X-API-Key`)
- Lewat dasbor: `http://localhost:18100/api/v1` (kunci disisipkan nginx, hanya GET)
- Waktu: ISO 8601 `+07:00`. Kunci JSON berbahasa Indonesia, sama dengan kolom database.

## Autentikasi

```
X-API-Key: <nilai API_KEY di .env>
```
Tanpa atau salah kunci → `401 {"galat":"tidak_diizinkan","pesan":"Header X-API-Key kosong atau salah."}`.
Hanya `GET /sehat` yang terbuka (untuk pemeriksaan kesehatan).

## Endpoint

| Metode & jalur | Query | Isi |
| --- | --- | --- |
| `GET /sehat` | | status layanan |
| `GET /parameter` | | parameter, satuan, baku mutu, jumlah desimal |
| `GET /titik` | | titik sampling dengan nilai terakhir tiap parameter dan statusnya |
| `GET /pembacaan` | `titik` (S1..S4, bawaan S4), `parameter` (wajib), `jam` 1..168 (24), `interval` menit 1..240 (15) | deret rata-rata/min/maks per kelompok waktu |
| `GET /kejadian` | `status` aktif\|semua, `limit` 1..200 (20) | rentang melewati baku mutu |
| `GET /webhook` | `limit` 1..100 (10) | ringkasan + log pengiriman ke sistem pelaporan |
| `GET /lab` | `titik` (S4) | hasil uji laboratorium |

### `GET /titik`
Status per nilai: `melewati`, `mendekati` (≥ 90 % batas atas, atau kurang dari 0,3 dari batas pH),
`normal`, `tanpa_baku_mutu` (debit, suhu), atau `dipantau` (titik selain outlet).

```json
{"data": [{"kode": "S4", "nama": "Outlet IPAL", "tahap": "Titik buang ke badan air (efluen)", "urutan": 4,
  "wajib_baku_mutu": true,
  "nilai": {"nh3n": {"nilai": 6.21, "waktu": "2026-11-05T11:43:01+07:00", "status": "melewati"},
            "cod":  {"nilai": 62.0, "waktu": "2026-11-05T11:43:01+07:00", "status": "normal"}}}]}
```

### `GET /pembacaan?titik=S4&parameter=cod&interval=60`
```json
{"titik": "S4", "parameter": "cod", "interval_menit": 60,
 "data": [{"waktu": "2026-11-04T12:00:00+07:00", "rata": 60.282, "min": 57.32, "maks": 63.658, "n": 30}]}
```

### `GET /kejadian`
```json
{"data": [
 {"id": 2, "titik": "S4", "parameter": "nh3n", "nama_parameter": "Amonia (NH3-N)", "satuan": "mg/L",
  "mulai": "2026-11-05T11:12:00+07:00", "selesai": null, "puncak": 6.292, "batas": 5.0, "durasi_menit": 31},
 {"id": 1, "titik": "S4", "parameter": "cod", "nama_parameter": "COD", "satuan": "mg/L",
  "mulai": "2026-11-05T08:32:00+07:00", "selesai": "2026-11-05T09:04:00+07:00", "puncak": 135.595, "batas": 100.0, "durasi_menit": 32}]}
```

### `GET /webhook?limit=2`
```json
{"ringkasan": {"terakhir_terkirim": "2026-11-05T11:46:31+07:00", "data_terkirim_sampai": "2026-11-05T11:46:31+07:00",
               "gagal_24jam": 1, "total_24jam": 5},
 "data": [
  {"id": 5, "waktu": "2026-11-05T11:46:31+07:00", "url": "http://penerima:8090/", "dari": "2026-11-05T11:44:31+07:00",
   "sampai": "2026-11-05T11:46:31+07:00", "jumlah_data": 24, "status_http": 202, "durasi_ms": 2, "hasil": "terkirim", "galat": null},
  {"id": 4, "waktu": "2026-11-05T11:45:31+07:00", "url": "http://penerima:8090/", "dari": "2026-11-05T11:44:31+07:00",
   "sampai": "2026-11-05T11:45:31+07:00", "jumlah_data": 12, "status_http": 503, "durasi_ms": 3, "hasil": "gagal",
   "galat": "Penerima menjawab HTTP 503: {\"pesan\":\"Layanan penerima sedang sibuk, kirim ulang nanti\"}"}]}
```

## Galat

Semua galat berbentuk `{"galat": "<kode>", "pesan": "<kalimat untuk manusia>"}`.

| HTTP | `galat` | Contoh penyebab |
| --- | --- | --- |
| 400 | `permintaan_salah` | `titik=S9`, `jam=0`, `parameter` kosong |
| 401 | `tidak_diizinkan` | kunci kosong atau salah |
| 403 | (nginx) | metode selain GET lewat dasbor |
| 404 | `http_404` | rute tidak dikenal |
| 503 | `basis_data` | MariaDB tidak dapat diakses |

## Webhook keluar (push ke sistem pelaporan)

Simulator mengirim pembacaan outlet S4 tiap `WEBHOOK_DETIK` (60 detik di mockup).

```
POST <WEBHOOK_URL>
Content-Type: application/json
X-Signature-256: sha256=<HMAC-SHA256(body, WEBHOOK_SECRET) dalam hex>
X-Idempotency-Key: <sha1(dari + sampai)>

{"sumber": "ipal-konsep-mockup", "titik": "S4", "dari": "2026-11-05T11:44:31+07:00", "sampai": "2026-11-05T11:46:31+07:00",
 "data": [{"parameter": "cod", "waktu": "2026-11-05T11:45:01+07:00", "nilai": 61.8}, ...]}
```

- Sukses = HTTP 2xx. Rentang `dari` selalu dimulai dari `sampai` pengiriman sukses terakhir, jadi data yang gagal
  ikut terkirim di percobaan berikutnya (tidak ada data hilang).
- Penerima wajib memverifikasi tanda tangan dan memakai `X-Idempotency-Key` untuk menolak kiriman ganda.
- Format muatan di atas adalah usulan mockup `[REAL DATA: spesifikasi sistem pelaporan lingkungan]`.

## Pemakaian di dasbor (`web/app.js`)

`/titik`, `/parameter`, `/kejadian?limit=6`, `/webhook?limit=6`, `/lab?titik=S4` dimuat bersamaan tiap 30 detik;
grafik memanggil `/pembacaan?titik=S4&parameter=<pilihan>&jam=24&interval=10`.
