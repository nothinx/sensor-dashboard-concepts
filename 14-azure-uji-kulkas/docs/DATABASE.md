# Model data Cosmos DB

Database `ujiakhir` (API NoSQL). Definisi container ada di satu tempat, `db/containers.json`, dan dibuat otomatis
oleh `common/cosmos.py` saat layanan mulai (emulator) atau oleh `infra/main.bicep` (cloud).

| Container | Partition key | TTL | Ditulis oleh | Isi |
|---|---|---|---|---|
| `pengujian` | `/lini` | 90 hari | IoT Hub (cloud) / simulator (lokal) | satu dokumen per percobaan uji satu unit |
| `alarm` | `/lini` | 30 hari | fungsi change feed | alarm gagal berulang dan FPY rendah |
| `leases` | `/id` | tidak ada | fungsi change feed | posisi baca change feed |

## Mengapa partisi per lini

- Kueri terpenting dasbor dan fungsi alarm bersifat **per lini** (riwayat 20 unit terakhir satu lini), jadi
  satu partisi logis cukup dan murah.
- Volume per lini kecil (sekitar 720 dokumen/hari pada takt 2 menit), jauh di bawah batas 20 GB per partisi
  logis, bahkan dengan TTL 90 hari.
- Bila lini bertambah banyak atau volume naik, ganti ke kunci hierarkis `/lini` + `/tanggal`.
  `ponytail:` saat ini cukup `/lini`.

## Dokumen `pengujian`

```json
{
  "id": "KLK-1P-180-L2-261105-0727-P1",
  "unit": "KLK-1P-180-L2-261105-0727",
  "lini": "L2",
  "model": "KLK-1P-180",
  "percobaan": 1,
  "vakum": {"kurva": [[0, 101357.4], [12, 69284.0], "… tiap 12 dtk sampai 300 dtk"], "waktu_capai_s": 285, "akhir_pa": 61.2},
  "bocor_g_tahun": 0.37,
  "evap_c": -16.1,
  "arus_a": 1.02,
  "hasil": "gagal",
  "alasan": ["vakum"],
  "waktu": "2026-11-05T05:26:56Z",
  "iothub": {"deviceId": "stasiun-uji-L2", "messageId": "L2-727-1", "enqueuedTime": "2026-11-05T05:26:56Z"}
}
```

- `id` = nomor unit + nomor percobaan, jadi kirim ulang pesan yang sama tidak menggandakan data (upsert idempoten).
- `hasil` dan `alasan` ditetapkan stasiun uji memakai aturan di `common/aturan.py`.
- `iothub` meniru metadata pesan IoT Hub; di cloud diisi oleh IoT Hub.

## Dokumen `alarm`

```json
{
  "id": "fpy-L2-2026-11-05T05",
  "lini": "L2", "jenis": "fpy_rendah", "tingkat": "peringatan",
  "unit": "KLK-1P-180-L2-261105-0727", "waktu": "2026-11-05T05:26:56Z",
  "pesan": "FPY 70 % pada 20 unit terakhir, di bawah 90 %. Penyebab terbanyak: vakum tidak tercapai."
}
```

| `jenis` | Pemicu | `id` (menjamin tidak dobel) |
|---|---|---|
| `gagal_berulang` (kritis) | unit gagal pada percobaan ke-2 atau lebih | `ulang-<unit>` |
| `fpy_rendah` (peringatan) | FPY 20 unit percobaan pertama terakhir di lini < 90 % | `fpy-<lini>-<jam UTC>`, maksimal satu per lini per jam |

## Kueri yang dipakai

| Pemakai | Kueri | Lingkup |
|---|---|---|
| fungsi change feed | `SELECT TOP 20 … WHERE c.percobaan = 1 AND c.waktu <= @w ORDER BY c.waktu DESC` | satu partisi |
| `/api/ringkasan` | `SELECT * FROM c WHERE c.waktu >= @s` (24 jam) | lintas partisi, ±1.500 dokumen |
| `/api/unit/{unit}` | `SELECT * FROM c WHERE c.unit = @u` | lintas partisi |
| `/api/perubahan` | `SELECT c.unit, c.lini, c.hasil, c._ts FROM c WHERE c._ts > @t` | lintas partisi |

Agregasi ringkasan (FPY per jam, alasan gagal) dihitung di API atas data 24 jam. `ponytail:` cukup untuk dua
lini; bila volume naik, pindahkan ke dokumen ringkasan per jam yang ditulis oleh fungsi change feed.

## Indeks

Kebijakan indeks bawaan Cosmos DB (semua path terindeks) dipakai apa adanya. Untuk produksi, kecualikan
`/vakum/kurva/*` dari indeks agar biaya tulis turun, karena kurva tidak pernah dipakai dalam filter.
