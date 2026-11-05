# API · Pemantauan Energi Listrik (v1)

Basis URL: `http://localhost:18030/api/v1`. Semua jawaban JSON UTF-8. Waktu dalam ISO 8601 zona WIB
(`+07:00`), resolusi menit. Angka memakai titik desimal (format JSON); dasbor yang mengubahnya ke format
Indonesia.

## Cache dengan ETag

Setiap jawaban `200` membawa header `ETag` (hash SHA-1 isi jawaban, 20 karakter) dan
`Cache-Control: no-cache`. Kirim nilai itu kembali pada permintaan berikutnya:

```http
GET /api/v1/dasbor HTTP/1.1
If-None-Match: "268a91c6dec0bea2e9e5"
```

Bila isi belum berubah, server menjawab `304 Not Modified` tanpa badan. Nilai sesaat diperbarui setiap
60 detik dan data interval setiap 15 menit, jadi polling lebih rapat dari 60 detik hanya menghasilkan
`304`.

Di browser, kirim header secara eksplisit dengan `fetch(url, { cache: "no-store", headers: { "If-None-Match": etag } })`
supaya status `304` sampai ke skrip, bukan dijawab diam-diam oleh cache browser.

## Galat

| Status | Kapan | Badan |
|---|---|---|
| 400 | parameter tidak valid | `{"galat": "Parameter jam harus bilangan bulat 1 sampai 192.", "status": 400}` |
| 404 | endpoint tidak ada | `{"galat": "Endpoint /api/v1/x tidak ada. Lihat docs/API.md.", "status": 404}` |
| 503 | database kosong atau belum siap | `{"galat": "Belum ada pembacaan. Simulator atau pengumpul data belum mengisi database.", "status": 503}` |

## Endpoint

| Metode & path | Parameter | Isi |
|---|---|---|
| `GET /dasbor` | - | gabungan semua blok di bawah; satu-satunya yang dipakai dasbor |
| `GET /ringkasan` | - | batas kontrak, beban sekarang, puncak hari ini, sisa kapasitas, energi, PF rata-rata |
| `GET /beban` | `jam` 1 sampai 192, bawaan 24 | deret beban panel utama per 15 menit |
| `GET /energi-per-jam` | `tanggal` `YYYY-MM-DD`, bawaan hari data terakhir | 24 slot kWh; jam yang belum lewat bernilai `null` |
| `GET /area` | `tanggal` | kWh per area (panel sub), terbesar dulu |
| `GET /panel` | - | nilai sesaat per panel + evaluasi kualitas daya |
| `GET /kesehatan` | - | `{"status": "ok", "data_terakhir": "..."}` untuk healthcheck |

"Hari ini" selalu berarti hari (WIB) dari interval terakhir yang tersimpan, bukan jam server. Ini
mencegah dasbor kosong tepat setelah tengah malam.

### `GET /ringkasan`

```json
{
  "tanggal": "2026-11-05",
  "batas_kontrak_kw": 1600.0,
  "beban_sekarang_kw": 1399.2,
  "beban_sekarang_ts": "2026-11-05T11:35+07:00",
  "puncak_hari_ini": { "kw": 1474.75, "ts": "2026-11-05T11:15+07:00" },
  "sisa_kapasitas_kw": 125.2,
  "penyumbang_puncak": [
    { "area": "Oven reflow (2 lini)", "kw_rata": 480.84 },
    { "area": "HVAC produksi", "kw_rata": 290.68 }
  ],
  "energi_hari_ini_kwh": 10690.1,
  "pf_rata_hari_ini": 0.916,
  "data_sampai": "2026-11-05T11:30+07:00"
}
```

- `puncak_hari_ini.kw` memakai `kw_maks` (demand maksimum dalam interval), bukan rata-rata.
- `sisa_kapasitas_kw = batas_kontrak_kw - puncak_hari_ini.kw`. Nilai negatif berarti batas terlewati.
- `pf_rata_hari_ini` adalah rata-rata tertimbang energi.

### `GET /beban?jam=1`

```json
[
  { "ts": "2026-11-05T10:45+07:00", "kw": 1410.54, "kw_maks": 1452.85 },
  { "ts": "2026-11-05T11:00+07:00", "kw": 1403.85, "kw_maks": 1445.97 }
]
```

`ts` adalah awal interval 15 menit.

### `GET /energi-per-jam?tanggal=2026-11-04`

```json
[ { "jam": 0, "kwh": 606.3 }, { "jam": 1, "kwh": 604.4 }, "...", { "jam": 23, "kwh": 611.0 } ]
```

### `GET /area`

```json
[ { "id": "SDP-SMT", "area": "Oven reflow (2 lini)", "kwh": 3822.8 }, { "id": "SDP-HVAC", "area": "HVAC produksi", "kwh": 1874.4 } ]
```

### `GET /panel`

```json
[
  {
    "id": "SDP-KMP", "nama": "SDP Kompresor", "area": "Kompresor & utilitas", "jenis": "sub",
    "ts": "2026-11-05T11:46+07:00", "kw": 195.3,
    "v": [229.5, 229.1, 228.8], "i": [305.1, 251.0, 300.2],
    "ketidakseimbangan_arus_persen": 11.9, "pf": 0.83, "thd_i_persen": 9.6,
    "status": "peringatan", "masalah": ["Faktor daya rendah", "Arus tidak seimbang"]
  }
]
```

- `v`: tegangan fasa-netral R, S, T (V). `i`: arus fasa R, S, T (A).
- `ketidakseimbangan_arus_persen`: simpangan terbesar dari rata-rata tiga fasa, dibagi rata-rata.
- Ambang evaluasi dibaca dari tabel `konfigurasi`: `pf_min` 0,85, `ketidakseimbangan_maks_persen` 10,
  `thd_i_maks_persen` 15. Ubah di database; API membacanya setiap permintaan.

### `GET /dasbor`

```json
{
  "ringkasan": { "...": "sama dengan /ringkasan" },
  "beban_24_jam": [ "96 titik seperti /beban?jam=24" ],
  "energi_per_jam": [ "24 slot hari data terakhir" ],
  "per_area": [ "..." ],
  "panel": [ "..." ]
}
```

## Contoh klien

```bash
# simpan ETag lalu minta ulang secara kondisional
etag=$(curl -s -D - -o /dev/null http://localhost:18030/api/v1/dasbor | awk -F': ' 'tolower($1)=="etag"{print $2}' | tr -d '\r')
curl -s -o /dev/null -w "%{http_code}\n" -H "If-None-Match: $etag" http://localhost:18030/api/v1/dasbor   # 304
```

## Keamanan

- Hanya metode `GET`. Tidak ada endpoint tulis; database dibuka dengan `PRAGMA query_only=1`.
- Parameter divalidasi dengan pola ketat sebelum dipakai; semua SQL memakai parameter terikat.
- Dasbor dan API satu origin, jadi tidak ada header CORS (permintaan lintas origin ditolak browser).
- Belum ada autentikasi; lihat bagian Batasan di README.
