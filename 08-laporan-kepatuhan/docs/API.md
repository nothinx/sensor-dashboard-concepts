# API · Laporan Kepatuhan Mutu

- Basis URL: `http://localhost:18080/api/v1`
- Spesifikasi mesin: [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1, diekspor dari aplikasi)
- Dokumentasi interaktif: `http://localhost:18080/docs` (Swagger UI) dan `/redoc`
- Format: JSON UTF-8; tanggal `YYYY-MM-DD`, waktu ISO 8601 dengan zona (`+07:00`)
- Galat: `{"detail": "<pesan>"}` atau, untuk validasi, `{"detail": [{"msg": "...", "loc": [...]}]}`

## Ringkasan endpoint

| Metode | Path | Fungsi | Kode sukses |
|---|---|---|---|
| GET | `/healthz` | cek API dan basis data | 200 |
| GET | `/api/v1/area` | daftar area (kode, nama) | 200 |
| GET | `/api/v1/kepatuhan?sampai=&hari=7` | persen waktu dalam syarat per area per hari | 200 |
| GET | `/api/v1/laporan?limit=10&cursor=` | daftar laporan, terbaru dulu | 200 |
| POST | `/api/v1/laporan` | antrekan penyusunan laporan | 202 |
| GET | `/api/v1/laporan/{id}` | status dan progres satu laporan | 200 |
| GET | `/api/v1/laporan/{id}/berkas` | unduh CSV/PDF | 200 |
| GET | `/api/v1/audit?limit=20&cursor=` | jejak audit, terbaru dulu | 200 |

## Kepatuhan

`GET /api/v1/kepatuhan?hari=3` (`hari` 1 sampai 31, `sampai` bawaan hari ini)

```json
{"dari":"2026-11-03","sampai":"2026-11-05","ambang_persen":99.0,"area":[
  {"kode":"SMT-L1","nama":"SMT Line 1","harian":[
    {"tanggal":"2026-11-03","detik_total":86400,"persen":99.12},
    {"tanggal":"2026-11-04","detik_total":86400,"persen":99.73},
    {"tanggal":"2026-11-05","detik_total":42262,"persen":98.5}],
   "persen_periode":99.25}]}
```

`persen` = `detik_sesuai / detik_total × 100`; `null` bila tidak ada data. `persen_periode` dibobot dengan
detik terpantau, bukan rata-rata sederhana harian.

## Laporan (asinkron)

### Membuat

```bash
curl -i -X POST http://localhost:18080/api/v1/laporan \
  -H "Content-Type: application/json" -H "X-Aktor: Supervisor QC" \
  -d '{"jenis":"kepatuhan","dari":"2026-10-30","sampai":"2026-11-05","format":"pdf"}'
```

| Field | Tipe | Aturan |
|---|---|---|
| `jenis` | `kepatuhan` \| `jejak_audit` | wajib |
| `area` | string | kode area dari `/area`; kosong = semua area |
| `dari`, `sampai` | tanggal | `sampai ≥ dari`, rentang ≤ 93 hari |
| `format` | `csv` \| `pdf` | wajib |
| Header `X-Aktor` | string | nama penyusun untuk jejak audit, ≤ 60 karakter |

Jawaban `202 Accepted`, header `Location: /api/v1/laporan/6376e4d2-e6b5-492b-956f-e48320f186b2`:

```json
{"id":"6376e4d2-e6b5-492b-956f-e48320f186b2","nomor":"QA/LK/2026/11/0001","jenis":"kepatuhan","area":null,
 "dari":"2026-10-30","sampai":"2026-11-05","format":"pdf","status":"antri","progres":0,"pesan_galat":null,
 "dibuat_oleh":"Supervisor QC","dibuat_pada":"2026-11-05T11:44:33.442171+07:00","selesai_pada":null,"url_berkas":null}
```

Nomor dokumen dibuat basis data: `QA/LK/<tahun>/<bulan>/<urut 4 digit>` (format contoh
`[REAL DATA: aturan penomoran dokumen mutu klien]`).

### Status

`GET /api/v1/laporan/{id}`. Status berjalan `antri` → `proses` → `selesai` atau `gagal`. Dasbor memeriksa
tiap 0,8 detik.

```json
{"nomor":"QA/LK/2026/11/0003","status":"gagal","progres":85,
 "pesan_galat":"Tidak ada data kepatuhan untuk 1 Januari 2025 sampai 31 Januari 2025. Data tersedia mulai 6 Oktober 2026. Pilih periode lain."}
```

### Unduh

`GET /api/v1/laporan/{id}/berkas` → `200`, `Content-Type: application/pdf` atau `text/csv; charset=utf-8`,
`Content-Disposition: attachment; filename="QA-LK-2026-11-0001.pdf"`. Bila belum selesai: `409`
`{"detail":"Laporan belum bisa diunduh karena berstatus proses."}`.

Kolom CSV kepatuhan: `tanggal,kode_area,nama_area,detik_total,detik_sesuai,persen_sesuai` (titik desimal,
supaya terbaca mesin). Kolom CSV audit: `id,waktu,aktor,aksi,tabel,rekaman,perubahan` (JSON).

## Paginasi kursor

Daftar laporan dan audit memakai kursor buram, bukan nomor halaman, supaya data baru tidak menggeser halaman.

```bash
curl "http://localhost:18080/api/v1/laporan?limit=2"
# {"data":[...2 item...],"cursor_berikut":"MjAyNi0xMS0wNVQxMTo0NDozNC4xMTk0NTArMDc6MDB8MzNi..."}
curl "http://localhost:18080/api/v1/laporan?limit=2&cursor=MjAyNi0xMS0wNVQxMTo0NDozNC4xMTk0NTArMDc6MDB8MzNi..."
# {"data":[...1 item...],"cursor_berikut":null}
```

Kursor laporan berisi `(dibuat_pada, id)`, kursor audit berisi `id`. Kursor rusak → `400`
`"Kursor tidak valid. Mulai lagi dari halaman pertama tanpa parameter cursor."`

## Jejak audit

`GET /api/v1/audit?limit=4`

```json
{"data":[{"id":23,"waktu":"2026-11-05T11:44:36.128642+07:00","aktor":"sistem","aksi":"UPDATE","tabel":"laporan",
  "rekaman":"QA/LK/2026/11/0003","perubahan":{"status":"gagal","pesan_galat":"Tidak ada data kepatuhan ...","selesai_pada":"..."}}],
 "cursor_berikut":"MjI"}
```

`perubahan` berisi seluruh baris saat `INSERT`/`DELETE`, dan hanya kolom yang berubah saat `UPDATE`.

## Kode galat

| Kode | Kapan |
|---|---|
| 400 | kursor rusak, header `X-Aktor` tidak valid |
| 404 | laporan tidak ditemukan |
| 409 | berkas diminta sebelum laporan selesai |
| 422 | body tidak valid (tanggal terbalik, rentang > 93 hari, area tak dikenal, jenis/format salah) |
| 500 | galat tak terduga; laporan yang gagal karena galat internal diberi pesan "Galat internal saat menyusun laporan…" |
