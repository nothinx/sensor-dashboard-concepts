# Database · Portal Mitra Servis

Postgres 17 (Supabase). Skema dibuat oleh migrasi di `supabase/migrations/`, data contoh oleh
`supabase/seed.sql`. Skema `sim` hanya untuk simulator dan tidak diekspos lewat API.

## Diagram relasi

```mermaid
erDiagram
  auth_users ||--|| profil : "user_id"
  mitra ||--o{ profil : "mitra_id"
  mitra ||--o{ unit : "mitra_id"
  mitra ||--o{ tiket : "mitra_id"
  unit ||--o{ tiket : "unit_serial"
  sla ||--o{ tiket : "prioritas"
  mitra { uuid id PK; text kode "SMG, 3 huruf"; text nama; text kota }
  profil { uuid user_id PK; uuid mitra_id FK; text nama }
  unit { text serial PK; text model; text kota; uuid mitra_id FK; text pelanggan_ref "ID tersamar"; date dipasang }
  sla { text prioritas PK "tinggi, sedang, rendah"; interval batas_tanggap }
  tiket { bigint id PK; text nomor UK; uuid mitra_id FK; text unit_serial FK; text keluhan; text prioritas FK; text status; timestamptz dibuat_pada; timestamptz batas_tanggap "trigger dari sla"; timestamptz ditanggapi_pada; timestamptz jadwal_kunjungan; timestamptz selesai_pada }
```

## Batasan data (constraint)

- `mitra.kode` tiga huruf kapital; `unit.serial` pola `[A-Z0-9-]{4,24}`.
- `tiket.status` ∈ `baru`, `dijadwalkan`, `dikerjakan`, `selesai`; `keluhan` 5 sampai 300 karakter.
- `ditanggapi_pada ≥ dibuat_pada`.
- `batas_tanggap` diisi trigger `isi_batas_tanggap` dari tabel `sla` saat tiket dibuat.

## Row Level Security

| Tabel | Operasi | Peran | Kebijakan |
|---|---|---|---|
| `mitra` | SELECT | authenticated | `id = mitra_saya()` |
| `profil` | SELECT | authenticated | `user_id = auth.uid()` |
| `unit` | SELECT | authenticated | `mitra_id = mitra_saya()` |
| `tiket` | SELECT | authenticated | `mitra_id = mitra_saya()` |
| `tiket` | UPDATE | authenticated | `using` dan `with check`: `mitra_id = mitra_saya()` |
| `sla` | SELECT | authenticated | semua baris |

Hak tabel: `anon` dicabut seluruhnya; `authenticated` hanya `SELECT`, ditambah `UPDATE (status,
ditanggapi_pada, jadwal_kunjungan, selesai_pada)` pada `tiket`. Tidak ada INSERT/DELETE dari peramban; tiket
dibuat oleh sistem pabrik dengan peran server.

`mitra_saya()` adalah fungsi `stable security definer` dengan `search_path = ''`, dipanggil dalam bentuk
`(select public.mitra_saya())` supaya dievaluasi sekali per kueri, bukan per baris.

## Fungsi

| Fungsi | Jenis | Kegunaan |
|---|---|---|
| `mitra_saya()` | `security definer`, `stable` | mitra milik pengguna login |
| `kinerja_mitra(hari int)` | `security definer`, `stable` | waktu tanggap rata-rata dan % tepat SLA: milik sendiri dan rata-rata semua mitra |
| `isi_batas_tanggap()` | trigger | `batas_tanggap = dibuat_pada + sla.batas_tanggap` |
| `sim.tiket_baru`, `sim.backfill`, `sim.tick` | simulator | data contoh; tidak diekspos |

## Indeks

`unit(mitra_id)`, `tiket(mitra_id, status)`, `tiket(dibuat_pada desc)`, ditambah indeks unik `tiket(nomor)`
dan kunci primer. Kueri papan SLA memakai `mitra_id` (dari RLS) + `status`.

## Realtime

`alter publication supabase_realtime add table public.tiket;`

## Volume dan retensi

| Data | Volume contoh | Retensi |
|---|---|---|
| `tiket` | ~7 per hari untuk 3 mitra | contoh: tanpa batas; produksi `[REAL DATA: kebijakan arsip layanan purnajual]` |
| `unit` | 75 | selama unit dalam masa layanan |

Untuk produksi, tiket selesai yang lebih tua dari masa arsip bisa dipindah ke tabel arsip dengan `pg_cron`
(tersedia di Supabase).
