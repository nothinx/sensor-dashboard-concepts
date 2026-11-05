# API · Armada AC Pintar

API dibuat otomatis oleh **PostgREST v12** dari schema `api`. Tidak ada kode backend: menambah endpoint berarti
menambah view atau fungsi di `db/04-api.sql`.

- Basis URL lewat dasbor: `http://localhost:18090/api`
- Basis URL langsung: `http://localhost:18092`
- Dokumen OpenAPI 2.0 otomatis: `GET http://localhost:18092/`
- Autentikasi: tidak ada (peran `web_anon`, baca saja). Lihat bagian Keamanan di README.
- Format waktu: ISO 8601 dengan zona `+07:00`. Angka desimal dikirim sebagai angka JSON.

## Bahasa query PostgREST (ringkas)

| Kebutuhan | Contoh |
| --- | --- |
| Filter sama dengan | `?status=eq.kritis` |
| Filter tidak sama | `?status=neq.normal` |
| Lebih besar/kecil | `?waktu=gte.2026-11-04T12:00:00%2B07:00` |
| Urutkan | `?order=status,unit_id` atau `?order=waktu.desc` |
| Pilih kolom | `?select=unit_id,kota,status` |
| Batas & geser | `?limit=50&offset=100` (maks 2.000 baris per permintaan) |
| Hitung total | header `Prefer: count=exact` → `Content-Range: 0-49/240` |

## Endpoint

### `GET /rpc/ringkasan_armada`
Ringkasan seluruh armada untuk baris KPI dasbor.

```json
{"total": 240, "terhubung": 237, "normal": 222, "perlu_servis": 5, "kritis": 10, "offline": 3,
 "tiket_baru": 1, "tiket_dijadwalkan": 2, "bermasalah_tanpa_tiket": 15,
 "diperbarui": "2026-11-05T11:46:41.867608+07:00"}
```

### `GET /unit_status`
Status terkini per unit (satu baris per unit, pembacaan terakhir). Kolom `status`: `normal`, `perlu_servis`,
`kritis`, `offline`. Aturan status: [DATABASE.md](DATABASE.md#aturan-status).

```
GET /unit_status?status=eq.perlu_servis&limit=1
```
```json
[{"unit_id": "AC-BDG-0074", "kota": "Bandung", "model": "Split dinding 1,5 PK", "kapasitas_pk": 1.5,
  "refrigeran": "R32", "pelanggan_ref": "PLG-C43CF1", "dipasang": "2024-08-10",
  "terakhir": "2026-11-05T11:46:34.222398+07:00", "menyala": true, "suhu_set": 23.0, "suhu_ruang": 27.8,
  "suhu_luar": 30.7, "arus_kompresor": 3.8, "tekanan_hisap": 93.8, "kode_galat": null,
  "status": "perlu_servis", "alasan": "Tekanan hisap rendah, kemungkinan refrigeran berkurang",
  "tiket_id": 13, "tiket_status": "dijadwalkan"}]
```

### `GET /telemetri`
Deret waktu mentah. **Selalu** sertakan filter `unit_id` dan `waktu` supaya memakai indeks.

```
GET /telemetri?unit_id=eq.AC-BDG-0074&waktu=gte.2026-11-04T11:46:00%2B07:00&order=waktu.asc
    &select=waktu,suhu_set,suhu_ruang,arus_kompresor,tekanan_hisap
```
```json
[{"unit_id": "AC-BDG-0074", "waktu": "2026-11-05T11:46:34.222398+07:00", "menyala": true, "suhu_set": 23.0,
  "suhu_ruang": 27.8, "suhu_luar": 30.7, "arus_kompresor": 3.8, "tekanan_hisap": 93.8, "kode_galat": null}]
```

### `GET /per_kota`
`[{"kota": "Bandung", "total": 40, "bermasalah": 4}, ...]`

### `GET /galat_24jam`
Kode galat yang dilaporkan 24 jam terakhir: `kode`, `arti`, `tindakan`, `jumlah_unit`, `jumlah_laporan`.

### `GET /tiket`
```json
[{"id": 13, "unit_id": "AC-BDG-0074", "kota": "Bandung", "model": "Split dinding 1,5 PK",
  "dibuat": "2026-11-05T06:33:29.568967+07:00", "status": "dijadwalkan",
  "masalah": "Pendinginan lemah, tekanan hisap turun", "peran_teknisi": "Teknisi mitra area",
  "jadwal": "2026-11-06T09:00:00+07:00", "selesai": null}]
```

### `GET /kode_galat`
Kamus kode galat (`kode`, `arti`, `tindakan`).

## Galat

PostgREST menjawab JSON `{"code", "message", "details", "hint"}`:

| HTTP | Kapan |
| --- | --- |
| 400 | filter atau kolom salah tulis (`?status=xx.kritis`) |
| 404 | view tidak ada di schema `api` (mis. tabel inti `/unit`) |
| 403 | metode selain GET/HEAD/POST lewat nginx |
| 503 | PostgREST belum tersambung ke database |

## Pemakaian di dasbor (`web/app.js`)

| Panel | Permintaan |
| --- | --- |
| KPI | `/rpc/ringkasan_armada` |
| Daftar unit bermasalah | `/unit_status?status=neq.normal&order=status,unit_id` |
| Per kota | `/per_kota?order=bermasalah.desc,kota` |
| Kode galat | `/galat_24jam?order=jumlah_unit.desc` |
| Kartu tiket | `/tiket?status=neq.selesai&order=dibuat.desc` |
| Grafik unit | `/telemetri?unit_id=eq.<id>&waktu=gte.<24 jam lalu>&order=waktu.asc&select=...` |

Semua dimuat ulang tiap 30 detik.
