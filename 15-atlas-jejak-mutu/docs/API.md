# API · Jejak Mutu

Basis URL: `http://localhost:18150/api` (satu origin dengan dasbor, jadi CORS tidak dipakai). Semua rute
`GET`, jawaban JSON UTF-8, waktu ISO 8601 zona WIB (`+07:00`), header `Cache-Control: no-store`.

## Ringkas

| Rute | Kegunaan |
|---|---|
| `GET /health` | cek koneksi ke MongoDB (`ping`) |
| `GET /cari?q=` | Atlas Search atas nomor seri, kode cacat, model, catatan QC |
| `GET /unit/{serial}` | perjalanan satu unit melewati 4 stasiun |
| `GET /cacat?hari=7` | kode cacat terbanyak dalam N hari |
| `GET /kejadian` | 30 kejadian terakhir dari change stream |
| `GET /ringkasan` | angka hari ini + unit sorotan |

## `GET /cari?q={kata}`

`q`: 2 sampai 60 karakter. Nomor seri dicocokkan sebagai awalan (autocomplete, bobot 5); kata lain dicocokkan
ke `catatan_qc.teks`, `kode_cacat`, `model` dengan toleransi salah ketik 1 huruf. Maksimal 8 hasil.

```json
{
  "kueri": "garis panel",
  "hasil": [
    {
      "serial": "TV50-2611-000406",
      "model": "TV LED 50 inci",
      "status": "dikemas",
      "stasiun_terakhir": "KEMAS",
      "kode_cacat": ["PNL-02"],
      "skor": 1.7785,
      "cuplikan": "Garis vertikal tipis pada panel saat uji pola warna merah"
    }
  ]
}
```

Pipeline yang dijalankan (lihat `tahap_cari` di `api/app.py`):

```json
[{"$search": {"index": "cari_unit", "compound": {"should": [
   {"autocomplete": {"query": "<q>", "path": "serial", "score": {"boost": {"value": 5}}}},
   {"text": {"query": "<q>", "path": ["catatan_qc.teks", "kode_cacat", "model"], "fuzzy": {"maxEdits": 1}}}],
   "minimumShouldMatch": 1}, "highlight": {"path": "catatan_qc.teks"}}},
 {"$limit": 8}, {"$project": {"...": "..."}}]
```

## `GET /unit/{serial}`

`serial` cocok pola `[A-Z0-9-]{4,24}` (huruf kecil diubah ke kapital).

```json
{
  "serial": "TV50-2611-000634",
  "model": "TV LED 50 inci",
  "lini": "Lini TV 2",
  "status": "ditahan",
  "dibuat_pada": "2026-11-05T12:25:02+07:00",
  "catatan_qc": [{"waktu": "2026-11-05T12:27:14+07:00", "stasiun": "UJI-AKHIR", "teks": "Sensor remote tidak merespons dari jarak 5 meter"}],
  "langkah": [
    {"stasiun": "PERAKITAN", "status": "lulus", "waktu": "…", "operator": "OP-020", "nilai": {}, "percobaan": [{"waktu": "…", "hasil": "lulus", "kode_cacat": null, "catatan": null}]},
    {"stasiun": "UJI-FUNGSI", "status": "lulus", "waktu": "…", "operator": "OP-031", "nilai": {"daya_w": 64.6}, "percobaan": ["…"]},
    {"stasiun": "UJI-AKHIR", "status": "gagal", "waktu": "…", "operator": "OP-011", "nilai": {"hipot_ma": 0.31},
     "percobaan": [{"waktu": "…", "hasil": "gagal", "kode_cacat": "IR-01", "catatan": "Sensor remote tidak merespons dari jarak 5 meter"}]},
    {"stasiun": "KEMAS", "status": "belum"}
  ]
}
```

`status` langkah: `lulus`, `gagal` (hasil percobaan terakhir di stasiun itu), atau `belum`. `percobaan` berisi
semua uji di stasiun itu berurutan, sehingga perbaikan (gagal lalu lulus) terlihat.

## `GET /cacat?hari={1..90}`

```json
{"hari": 7, "total_uji": 2578, "cacat": [{"kode": "KSM-02", "jumlah": 25, "contoh": "Penyok kecil di panel samping kanan"}]}
```

Agregasi pada time series `uji`: `$match` hasil `gagal` dalam rentang, `$group` per `kode_cacat`, 6 teratas.

## `GET /kejadian`

```json
{"kejadian": [{"waktu": "2026-11-05T12:27:14+07:00", "serial": "TV50-2611-000634", "model": "TV LED 50 inci",
               "stasiun": "UJI-AKHIR", "status": "ditahan", "kode_cacat": "IR-01"}]}
```

Diisi oleh `unit.watch()` (operasi `insert`/`update`, `fullDocument: updateLookup`). Saat API start, diisi awal
15 unit yang terakhir berubah.

## `GET /ringkasan`

```json
{"diperbarui": "2026-11-05T12:27:32+07:00", "ditahan": 2, "di_lini": 15, "dikemas_hari_ini": 33,
 "uji_hari_ini": 166, "gagal_hari_ini": 6,
 "sorotan": [{"serial": "TV50-2611-000634", "ditahan": true}, {"serial": "TV32-2611-000630", "ditahan": false}]}
```

`sorotan`: maksimal 4 unit untuk pintasan di bawah kolom cari, yang ditahan dulu lalu unit terakhir yang punya
riwayat cacat.

## Galat

| Kode | Kapan | Isi |
|---|---|---|
| 400 | kueri < 2 atau > 60 karakter, nomor seri tak sesuai pola, `hari` di luar 1 sampai 90 | `{"galat": "Kata kunci harus 2 sampai 60 karakter."}` |
| 404 | nomor seri tidak ada, rute tak dikenal | `{"galat": "Nomor seri tidak ditemukan."}` |
| 503 | MongoDB tidak menjawab | `{"galat": "Database tidak menjawab (ServerSelectionTimeoutError)."}` |
