# API Uji Akhir Lini Kulkas

Basis URL lokal: `http://localhost:18140`. Semua endpoint hanya `GET` (metode lain dijawab 405) dan
mengembalikan JSON. Spesifikasi OpenAPI otomatis tersedia saat stack berjalan di `/docs` dan `/openapi.json`.

## Cara dasbor menarik data: REST + long polling

Proyek lain di kumpulan ini memakai WebSocket (01), polling biasa (02), ETag (03), SSE (05), dan MQTT (06).
Proyek ini memakai **long polling** karena paling dekat dengan cara kerja change feed Cosmos DB: klien
menyimpan penanda `ts` (nilai `_ts` dokumen terbaru, detik epoch), lalu bertanya "ada yang lebih baru dari
ini?". Server menahan permintaan sampai ada dokumen baru atau 25 detik berlalu. Hasilnya hampir seketika
seperti push, tetapi tetap HTTP biasa: lolos proxy dan firewall pabrik, tanpa koneksi permanen.

```
dasbor                         API                              Cosmos DB
  | GET /api/ringkasan  -------> |  query 24 jam  ---------------> |
  | <------- ringkasan + ts      |                                  |
  | GET /api/perubahan?sejak=ts  |  tiap 2 dtk: _ts > ts ? -------> |
  |        (ditahan ≤ 25 dtk)    |                                  |
  | <------- {ada_baru: true}    |                                  |
  | GET /api/ringkasan  -------> |                                  |
```

## Endpoint

### `GET /api/health`
Status koneksi ke Cosmos DB. `503` bila database tidak terjangkau.
```json
{"status": "ok", "mode": "emulator"}
```

### `GET /api/ringkasan`
Semua yang dibutuhkan satu layar dasbor untuk 24 jam terakhir.

| Field | Isi |
|---|---|
| `sekarang` | waktu server (UTC, ISO 8601) |
| `batas` | ambang uji yang berlaku (lihat DAFTAR-TITIK.md) |
| `fpy_min` | target first pass yield, persen |
| `lini.L1`, `lini.L2` | `unit_24j`, `fpy_24j`, `fpy_20_terakhir`, `fpy_per_jam` (24 jam: `jam`, `fpy`, `unit`), `terakhir` (dengan `vakum_kurva`), `riwayat` (10 percobaan terakhir), `gagal_24j`, `menunggu` |
| `menunggu_ulang` | 12 unit terbaru yang gagal pada percobaan pertama dan belum diuji ulang |
| `jumlah_menunggu` | total unit menunggu uji ulang |
| `alasan_gagal` | `kode`, `label`, `jumlah`, diurutkan dari terbanyak |
| `alarm` | 8 alarm terbaru dari fungsi change feed |
| `ts` | `_ts` dokumen terbaru, untuk `/api/perubahan` |

Contoh (dipotong):
```json
{
  "sekarang": "2026-11-05T05:27:41Z",
  "batas": {"vakum_target_pa": 100.0, "vakum_waktu_maks_s": 240, "bocor_maks_g_tahun": 3.0,
            "dingin_menit": 10, "dingin_evap_maks_c": -12.0, "arus_min_a": 0.6, "arus_maks_a": 1.4},
  "fpy_min": 90.0,
  "lini": {
    "L2": {
      "unit_24j": 723, "fpy_24j": 90.2, "fpy_20_terakhir": 70.0, "gagal_24j": 72, "menunggu": 9,
      "fpy_per_jam": [{"jam": "2026-11-04T06:00:00Z", "fpy": 93.3, "unit": 30}, "…"],
      "terakhir": {"unit": "KLK-1P-180-L2-261105-0727", "percobaan": 1, "hasil": "gagal", "alasan": ["vakum"],
                   "vakum_capai_s": 285, "vakum_akhir_pa": 61.2, "bocor_g_tahun": 0.37, "evap_c": -16.1,
                   "arus_a": 1.02, "vakum_kurva": [[0, 101357.4], [12, 69284.0], "…"]}
    }
  },
  "alasan_gagal": [{"kode": "vakum", "label": "Vakum tidak tercapai", "jumlah": 46}, "…"],
  "alarm": [{"id": "fpy-L2-2026-11-05T05", "lini": "L2", "jenis": "fpy_rendah", "tingkat": "peringatan",
             "pesan": "FPY 70 % pada 20 unit terakhir, di bawah 90 %. Penyebab terbanyak: vakum tidak tercapai.", "…": "…"}],
  "ts": 1793856326
}
```

### `GET /api/unit/{unit}`
Semua percobaan uji satu unit (dengan kurva vakum), urut percobaan.

| Kode | Arti |
|---|---|
| 200 | daftar percobaan |
| 400 | format nomor unit salah: `{"detail": "Nomor unit tidak valid. Gunakan huruf kapital, angka, dan tanda hubung."}` |
| 404 | `{"detail": "Unit ABC-TIDAK-ADA tidak ditemukan dalam data 90 hari terakhir."}` |

### `GET /api/perubahan?sejak={ts}&tunggu={detik}`
Long polling. `sejak` wajib (bilangan bulat ≥ 0), `tunggu` 0 sampai 25 (bawaan 25).
```json
{"ada_baru": true, "jumlah": 1, "ts": 1793856356}
```
Bila tidak ada dokumen baru sampai batas waktu: `{"ada_baru": false, "jumlah": 0, "ts": <sejak>}`.
Parameter salah dijawab `422` dengan rincian validasi FastAPI.

## Statis
- `/` dialihkan ke `/web/index.html` (dasbor).
- `/shared/charts.js`, `/shared/charts.css`: pustaka grafik bersama, di-mount read-only dari `../shared`.
