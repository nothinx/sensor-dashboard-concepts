# API GraphQL · Perawatan Prediktif Getaran

Endpoint tunggal: `POST http://localhost:18040/graphql` dengan badan JSON
`{"query": "...", "variables": {...}}`. Skema lengkap (SDL) ada di [`api/schema.graphql`](../api/schema.graphql).
GraphiQL tersedia di `GET /graphql` bila `GRAPHIQL=1`.

Nama field memakai camelCase (konvensi GraphQL). Waktu (`DateTime`) dalam ISO 8601 UTC; dasbor
mengubahnya ke WIB. Tanggal (`Date`) pada tren adalah tanggal WIB.

## Tipe utama

| Tipe | Field penting |
|---|---|
| `Mesin` | `id`, `nama`, `area`, `kelasIso`, `rpm`, `bantalan`, `rmsTerkiniMmS`, `zona` (A sampai D), `status`, `perubahan30HariMmS`, `batasZona`, `tren(hari)`, `spektrum`, `perintahKerja` |
| `Status` | `NORMAL`, `PERINGATAN` (zona C), `KRITIS` (zona D), `OFFLINE` (data lebih tua dari `OFFLINE_MENIT`) |
| `BatasZona` | `ab`, `bc`, `cd`: batas zona ISO 10816-1 kelas mesin, mm/s RMS |
| `TitikTren` | `tanggal`, `rmsMmS` (rata-rata harian), `suhuMaksC` |
| `Spektrum` | `diukurPada`, `resolusiHz`, `frekuensiPutarHz`, `bpfoHz`, `amplitudoMmS` (daftar 200 nilai; indeks `i` berada pada `i × resolusiHz` Hz) |
| `PerintahKerja` | `id`, `mesinId`, `judul`, `prioritas` (`RENDAH`, `SEDANG`, `TINGGI`), `status`, `dibuatPada` |

## Query

| Field | Argumen | Isi |
|---|---|---|
| `daftarMesin` | `area: String` opsional | semua mesin, urut `KRITIS`, `PERINGATAN`, `OFFLINE`, `NORMAL`, lalu RMS terbesar |
| `mesin` | `id: ID!` | satu mesin atau `null` |
| `ringkasan` | - | `jumlahMesin`, `perluTindakan`, `offline` |

### Contoh: daftar untuk sidebar

```graphql
{
  ringkasan { jumlahMesin perluTindakan offline }
  daftarMesin { id nama area zona status rmsTerkiniMmS }
}
```

```json
{ "data": {
  "ringkasan": { "jumlahMesin": 7, "perluTindakan": 1, "offline": 1 },
  "daftarMesin": [
    { "id": "K-02", "nama": "Kompresor udara K-02", "area": "Kompresor & utilitas", "zona": "C", "status": "PERINGATAN", "rmsTerkiniMmS": 5.46 },
    { "id": "CV-TV", "nama": "Konveyor perakitan TV", "area": "Perakitan TV", "zona": "B", "status": "OFFLINE", "rmsTerkiniMmS": 0.91 }
  ] } }
```

Untuk mesin `OFFLINE`, `zona` dan `rmsTerkiniMmS` adalah nilai terakhir yang diketahui; tampilkan sebagai
nilai lama, bukan kondisi sekarang.

### Contoh: detail mesin (dipakai dasbor)

```graphql
query Detail($id: ID!) {
  mesin(id: $id) {
    id nama zona status rmsTerkiniMmS perubahan30HariMmS suhuBantalanC
    batasZona { ab bc cd }
    tren(hari: 30) { tanggal rmsMmS suhuMaksC }
    spektrum { diukurPada resolusiHz frekuensiPutarHz bpfoHz amplitudoMmS }
    perintahKerja { id judul prioritas status dibuatPada }
  }
}
```

Variabel: `{"id": "K-02"}`. Potongan jawaban:

```json
{ "data": { "mesin": {
  "id": "K-02", "zona": "C", "status": "PERINGATAN", "rmsTerkiniMmS": 5.46, "perubahan30HariMmS": 2.32,
  "batasZona": { "ab": 1.12, "bc": 2.8, "cd": 7.1 },
  "tren": [ { "tanggal": "2026-11-03", "rmsMmS": 4.98 }, { "tanggal": "2026-11-04", "rmsMmS": 5.12 }, { "tanggal": "2026-11-05", "rmsMmS": 5.42 } ],
  "spektrum": { "bpfoHz": 88.8, "frekuensiPutarHz": 24.8, "resolusiHz": 2.0, "amplitudoMmS": [0.061, 0.054, "... 200 nilai"] }
} } }
```

## Mutation

```graphql
mutation Buat($input: PerintahKerjaInput!) {
  buatPerintahKerja(input: $input) { id judul prioritas status dibuatPada }
}
```

```json
{ "input": { "mesinId": "K-02", "judul": "Periksa bearing sisi penggerak K-02", "prioritas": "TINGGI" } }
```

Jawaban:

```json
{ "data": { "buatPerintahKerja": { "id": "PK-97E9360C", "judul": "Periksa bearing sisi penggerak K-02",
  "prioritas": "TINGGI", "status": "DIBUKA", "dibuatPada": "2026-11-05T04:46:57+00:00" } } }
```

Aturan: spasi berlebih di judul dirapikan; judul 3 sampai 120 karakter; `mesinId` harus terdaftar di
`db/mesin.csv`. Setiap perintah kerja ditulis sebagai satu file Parquet baru, jadi tidak ada penimpaan.

## Galat

Galat dikembalikan dengan status HTTP 200 sesuai konvensi GraphQL, di larik `errors`:

```json
{ "data": null, "errors": [ { "message": "Judul perintah kerja harus 3 sampai 120 karakter.", "path": ["buatPerintahKerja"] } ] }
```

| Pesan | Sebab |
|---|---|
| `Data getaran belum tersedia; simulator atau pengumpul data belum menulis file.` | folder Parquet masih kosong |
| `Argumen hari harus 1 sampai 90.` | `tren(hari:)` di luar rentang |
| `Mesin X-99 tidak terdaftar.` | mutation untuk mesin yang tidak ada |
| `Judul perintah kerja harus 3 sampai 120 karakter.` | validasi input |

## Pengaman kueri

- `QueryDepthLimiter(max_depth=6)` dan `MaxAliasesLimiter(15)` menolak kueri yang terlalu dalam atau
  digandakan dengan alias.
- Semua SQL memakai parameter terikat; nama file perintah kerja dibuat server (`PK-` + 8 hex acak).
- Hanya `/shared/charts.js` dan `/shared/charts.css` yang disajikan dari folder bersama.
- Dasbor dan API satu origin; tidak ada header CORS.

## Contoh klien

```bash
curl -s -X POST http://localhost:18040/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ ringkasan { jumlahMesin perluTindakan offline } }"}'
```
