# API · Monitor Oven Reflow SMT

Basis URL: `http://localhost:18020`. Spesifikasi OpenAPI otomatis: `/openapi.json`, tampilan interaktif:
`/docs`. Dasbor dan API satu origin; CORS tidak dibuka.

| Metode | Jalur | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek API dan ping InfluxDB |
| GET | `/api/lines` | Daftar lini dan resep aktif |
| GET | `/api/lines/{line}/dashboard` | Semua data satu layar (dipoll tiap 5 detik) |
| GET | `/api/lines/{line}/zones/{zone}/trend?range=` | Tren suhu aktual satu zona |

Parameter: `line` ∈ `L1`, `L2`; `zone` ∈ `Z1` sampai `Z10`; `range` ∈ `2h` (rata-rata 1 menit),
`24h` (15 menit), `7d` (1 jam). Nilai lain → **422** dengan detail validasi FastAPI.

## GET /api/lines

```json
[
  { "id": "L1", "name": "Line 1", "recipe": "[REAL DATA: nama resep Line 1]" },
  { "id": "L2", "name": "Line 2", "recipe": "[REAL DATA: nama resep Line 2]" }
]
```

## GET /api/lines/{line}/dashboard

```json
{
  "line": "L2",
  "recipe": "[REAL DATA: nama resep Line 2]",
  "now": "2026-11-05T04:40:35.120Z",
  "tolerance_c": 3.0,
  "liquidus_c": 217.0,
  "overview": { "o2_ppm": 799, "conveyor_mpm": 0.75, "conveyor_recipe_mpm": 0.9, "boards_shift": 1305 },
  "zones": [
    { "zone": "Z1", "setpoint": 120.0, "actual": 120.5, "delta": 0.5, "heater_pct": 42.0, "fan_rpm": 1448, "status": "ok" },
    { "zone": "Z6", "setpoint": 245.0, "actual": 252.2, "delta": 7.2, "heater_pct": 100.0, "fan_rpm": 1810, "status": "crit" }
  ],
  "profile": {
    "run": "202611050435", "start": "2026-11-05T04:35:00+00:00", "step_s": 5.0,
    "temps": [30.2, 38.1, "… 60 nilai …"], "peak_c": 249.1, "tal_s": 65
  },
  "focus": {
    "zone": "Z6", "setpoint": 245.0, "actual": 252.2, "delta": 7.2, "heater_pct": 100.0, "fan_rpm": 1810, "status": "crit",
    "trend": [{ "t": "2026-11-05T02:41:00+00:00", "v": 245.61 }, "… 121 titik …"]
  }
}
```

- `status` zona: `crit` bila |selisih| > toleransi, `warn` bila > ⅔ toleransi, selain itu `ok`.
- `profile` = lintasan papan uji terbaru dalam 25 menit terakhir (`null` bila belum ada). `tal_s` =
  waktu di atas `liquidus_c`.
- `focus` = zona dengan |selisih| terbesar beserta tren 2 jam.
- **503** bila belum ada data zona dalam 2 menit terakhir atau InfluxDB tidak menjawab; isi `detail`
  menyebut sebab dan langkah.

## GET /api/lines/{line}/zones/{zone}/trend

```http
GET /api/lines/L1/zones/Z6/trend?range=24h
```
```json
{ "line": "L1", "zone": "Z6", "range": "24h", "every": "15m",
  "points": [{ "t": "2026-11-04T04:45:00+00:00", "v": 245.02 }, "… 97 titik …"] }
```
`v` bernilai `null` untuk jendela tanpa data (`createEmpty: true`), sehingga celah tetap terlihat di grafik.

## Query Flux di balik endpoint

Nilai `_line` dan `_zone` dikirim sebagai parameter query (`params=`), bukan disambung ke teks Flux.

```flux
from(bucket: "oven_raw") |> range(start: -2m)
  |> filter(fn: (r) => r._measurement == "zone" and r.line == _line)
  |> last() |> group() |> pivot(rowKey: ["zone"], columnKey: ["_field"], valueColumn: "_value")
```
