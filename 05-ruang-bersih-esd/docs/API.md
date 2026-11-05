# API Pemantauan Ruang Bersih & ESD

Basis URL: `http://localhost:18050/api`. Semua jawaban JSON (UTF-8), waktu dalam ISO 8601 UTC.
Galat berbentuk `{"galat": "<penyebab dan langkah>"}` dengan kode HTTP yang sesuai.
CORS hanya mengizinkan origin `CORS_ORIGIN` (bawaan `http://localhost:18050`). Tidak ada cache (`Cache-Control: no-store`).

| Metode | Jalur | Fungsi |
|---|---|---|
| GET | `/health` | Cek API dan koneksi MongoDB |
| GET | `/snapshot` | Kondisi terkini semua ruang, titik, dan uji ESD |
| GET | `/titik/{id}/riwayat` | Deret waktu satu titik, dirata-rata per langkah |
| GET | `/stream` | Server-Sent Events: snapshot setiap 5 detik |

## GET /health

```json
{ "status": "ok" }
```
`500` bila MongoDB tidak menjawab.

## GET /snapshot

Contoh jawaban (dipotong):

```json
{
  "ts": "2026-11-05T04:38:08.120Z",
  "ruang": [
    { "id": "tv", "nama": "Perakitan TV", "lantai": 1,
      "geometri": { "x": 40, "y": 4, "w": 34, "h": 44 },
      "syarat": { "suhu": { "w": [22, 27], "k": [20, 29], "satuan": "°C" }, "rh": { "w": [40, 65], "k": [35, 70], "satuan": "%RH" } },
      "area_esd": true, "status": "warn", "titik": ["TH-TV-01", "ION-TV-01", "ION-TV-03", "ESD-TV-01"] }
  ],
  "titik": [
    { "id": "ION-TV-03", "ruang": "tv", "jenis": "ionizer", "nama": "Ionizer meja 7", "x": 66, "y": 34,
      "ambang": { "offset": { "w": [-35, 35], "k": [-50, 50], "satuan": "V" }, "luruh": { "w": [null, 5], "k": [null, 8], "satuan": "s" } },
      "status": "warn", "statusMetrik": { "offset": "warn", "luruh": "ok" },
      "ts": "2026-11-05T04:38:05.002Z", "nilai": { "offset": 37.4, "luruh": 4.36 } },
    { "id": "TH-GD-08", "jenis": "suhu_rh", "status": "off", "ts": "2026-11-04T22:35:00.000Z", "nilai": {} },
    { "id": "ESD-TV-01", "jenis": "esd", "status": "ok", "ts": "2026-11-05T04:37:23.000Z",
      "nilai": { "mohm": 5.91, "hasil": "lulus" }, "hari": { "lulus": 88, "gagal": 2 } }
  ],
  "esd": {
    "hari_ini": { "lulus": 262, "gagal": 5 },
    "terakhir": [ { "ts": "2026-11-05T04:37:43.000Z", "stasiun": "ESD-QC-01", "operator": "OP-020", "hasil": "lulus", "mohm": 2.47 } ]
  }
}
```

Aturan status:

| Status | Arti |
|---|---|
| `ok` | Semua metrik di dalam batas peringatan `w` |
| `warn` | Ada metrik di luar `w` tetapi masih di dalam batas kritis `k`; untuk stasiun ESD: uji terakhir gagal |
| `crit` | Ada metrik di luar `k` |
| `off` | Tidak ada bacaan lebih dari 2 menit; untuk stasiun ESD: belum pernah ada uji |

Status ruang = status terburuk dari titik di dalamnya (urutan: crit > warn > off > ok).
`null` pada ambang berarti sisi itu tidak dibatasi. "Hari ini" dihitung dari pukul 00.00 zona `TZ` (bawaan Asia/Jakarta).

## GET /titik/{id}/riwayat

| Parameter | Tipe | Bawaan | Aturan |
|---|---|---|---|
| `id` (jalur) | string | | `^[A-Z0-9-]{2,20}$`, harus ada di koleksi `titik` |
| `jam` | integer | 24 | 1 sampai 168 |
| `langkah` | integer (menit) | 15 | 1, 5, 15, atau 60 |

```bash
curl "localhost:18050/api/titik/TH-SMT-01/riwayat?jam=2&langkah=15"
```
```json
{
  "titik": "TH-SMT-01", "jenis": "suhu_rh", "langkah_menit": 15,
  "ambang": { "suhu": { "w": [22, 26], "k": [20, 28], "satuan": "°C" }, "rh": { "w": [40, 60], "k": [35, 65], "satuan": "%RH" } },
  "deret": [
    { "ts": "2026-11-05T02:30:00.000Z", "suhu": 24.25, "rh": 52.3 },
    { "ts": "2026-11-05T02:45:00.000Z", "suhu": 24.18, "rh": 51.6 }
  ]
}
```

| Kode | Kapan |
|---|---|
| 400 | `id`, `jam`, atau `langkah` tidak valid; titik jenis `esd` (tidak punya deret waktu) |
| 404 | `id` valid tetapi tidak ada |

## GET /stream (Server-Sent Events)

```bash
curl -N localhost:18050/api/stream
```
```
event: snapshot
data: {"ts":"2026-11-05T04:38:13.120Z","ruang":[...],"titik":[...],"esd":{...}}

```
- `event: snapshot` berisi objek yang sama dengan `GET /snapshot`, dikirim saat terhubung lalu setiap `SSE_INTERVAL_MS` (5000).
- `event: galat` berisi `{"galat": "..."}` bila snapshot gagal dihitung; koneksi tetap terbuka.
- Browser menyambung ulang otomatis (perilaku bawaan `EventSource`).

## Variabel lingkungan

| Nama | Bawaan | Keterangan |
|---|---|---|
| `MONGO_URL` | (wajib) | URL MongoDB dengan pengguna aplikasi |
| `MONGO_DB` | `ruangbersih` | Nama database |
| `PORT` | `8080` | Port di dalam kontainer (dipetakan ke 18050) |
| `CORS_ORIGIN` | `http://localhost:18050` | Origin yang diizinkan |
| `SSE_INTERVAL_MS` | `5000` | Jeda event SSE |
| `TZ` | `Asia/Jakarta` | Zona waktu untuk batas "hari ini" |
