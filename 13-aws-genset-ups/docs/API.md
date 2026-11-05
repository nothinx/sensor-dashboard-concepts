# API Genset & UPS Cabang

Basis URL: `http://localhost:18130/api` (lewat nginx), atau `http://localhost:18132` (adaptor langsung).
Di AWS: keluaran `UrlApi` dari stack SAM. Semua rute **hanya GET**, jawaban JSON UTF-8, `cache-control: no-store`.

## Format galat

```json
{ "galat": "Parameter limit harus bilangan bulat 1 sampai 50." }
```

| Kode | Arti |
| --- | --- |
| 400 | parameter tidak valid (pesan menyebut parameter dan rentangnya) |
| 403 | metode selain GET/HEAD lewat nginx |
| 404 | cabang tidak terdaftar atau rute tidak dikenal |
| 500 | galat server; detail ada di log fungsi |

## Paginasi

Rute daftar mengembalikan `next`. Bila tidak `null`, kirim ulang permintaan dengan `?next=<nilai>` untuk halaman
berikutnya. Nilainya adalah `LastEvaluatedKey` DynamoDB dalam base64url; perlakukan sebagai teks buram.
Token yang rusak dijawab 400.

## `GET /ringkasan`

```json
{ "total": 12, "kritis": 2, "waspada": 2, "normal": 8, "plnPadam": 2, "gensetJalan": 1,
  "diperbarui": "2026-11-05T05:21:41.288Z" }
```

## `GET /cabang`

| Parameter | Jenis | Bawaan | Keterangan |
| --- | --- | --- | --- |
| `status` | `kritis` \| `waspada` \| `normal` | semua | filter status |
| `limit` | 1 sampai 50 | 12 | jumlah per halaman |
| `next` | teks | | token halaman |

Urutan: kritis, waspada, normal; di dalamnya urut kode cabang.

```json
{
  "data": [{
    "kode": "MKS", "kota": "Makassar", "nama": "Cabang Makassar", "gensetKva": 200, "upsKva": 40,
    "status": "kritis", "alasan": ["PLN padam, genset tidak menyala"],
    "pln": { "ada": false, "padamSejak": "2026-11-05T05:09:41.904Z" },
    "genset": { "jalan": false, "bbm": 87, "jamJalan": 2707, "tegangan": 0, "frekuensi": 0 },
    "ups": { "baterai": 34, "runtime": 10, "beban": 42.5 },
    "diperbarui": "2026-11-05T05:21:41.288Z"
  }],
  "next": "eyJQSyI6IkNBQkFORyNNS1MiLCJTSyI6IlNUQVRVUyIs..."
}
```

## `GET /cabang/{kode}`

Satu cabang, bentuk sama dengan butir `data` di atas. `kode` tiga huruf (huruf kecil diterima).

## `GET /cabang/{kode}/riwayat?jam=24`

`jam` 1 sampai 168. Titik tiap ±1 menit (riwayat hasil isi awal: tiap 5 menit).

```json
{ "kode": "PLM", "jam": 24, "data": [
  { "ts": "2026-11-05T05:21:11.208Z", "status": "waspada", "plnAda": false, "gensetJalan": true,
    "bbm": 35.4, "tegangan": 229.8, "frekuensi": 50, "baterai": 100, "runtime": 25.1, "beban": 49.8 } ] }
```

## `GET /padam`

Kejadian PLN padam semua cabang, terbaru dulu. `limit` 1 sampai 50 (bawaan 10), `next` untuk halaman berikutnya.

```json
{ "data": [
  { "kode": "MKS", "nama": "Cabang Makassar", "mulai": "2026-11-05T05:09:41.904Z", "selesai": null, "gensetMenyala": false }
], "next": null }
```

## Pesan telemetri (masuk lewat IoT Core)

Topik `konsep/cabang/{KODE}/telemetri`. IoT Rule menambahkan `topic`, lalu memanggil Lambda ingest.

```json
{ "ts": "2026-11-05T05:21:41.288Z",
  "pln": { "ada": false },
  "genset": { "jalan": true, "bbm": 35.4, "jamJalan": 1340.2, "tegangan": 229.8, "frekuensi": 50.0 },
  "ups": { "baterai": 100, "runtime": 25.1, "beban": 49.8 },
  "simpanRiwayat": true }
```

Pesan dengan `ts` lebih lama daripada keadaan tersimpan tidak menimpa status (penulisan bersyarat), sehingga
pesan yang dikirim ulang tidak membalik keadaan.
