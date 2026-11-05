# 12 · Portal Mitra Servis (Supabase)

Pratinjau konsep portal untuk klien, ditujukan bagi **mitra servis resmi** yang menerima tiket
perbaikan dari pabrik. Setiap mitra login dengan akunnya sendiri dan hanya melihat tiket serta unit
pelanggan miliknya. Layar utama adalah papan SLA: tiket yang belum ditanggapi diurutkan dari sisa waktu
tanggap paling sedikit, dengan hitung mundur dan tombol untuk menjadwalkan kunjungan. Backend Docker adalah
demo teknis opsional untuk menunjukkan arsitektur yang diusulkan, dijalankan dengan Supabase CLI lokal
tanpa akun cloud.

> Semua data adalah **data contoh**: nama mitra, unit, keluhan, dan batas SLA. Batas SLA asli:
> `[REAL DATA: dari kontrak kemitraan servis]`.

| | |
|---|---|
| Pengguna utama | Mitra servis resmi |
| Database | Supabase: Postgres 17 dengan Row Level Security di setiap tabel |
| Cara menarik data | supabase-js 2.45.4 langsung dari peramban (REST lewat PostgREST) + Supabase Realtime |
| Backend | Tanpa backend buatan sendiri: Supabase Auth, PostgREST, Realtime; aturan akses di database |
| Dasbor | http://localhost:18120 |
| Pratinjau tanpa Docker | `web/index.html?pratinjau` |
| Status | Pratinjau konsep (mockup), bukan sistem produksi. Backend demo diuji 5 November 2026 dengan emulator lokal (Supabase CLI). |

## Arsitektur

```mermaid
flowchart LR
  B[peramban<br/>supabase-js 2.45.4] -->|login email + sandi| AUTH[Auth / GoTrue]
  B -->|REST + JWT| REST[PostgREST]
  B <-->|WebSocket, postgres_changes| RT[Realtime]
  AUTH --> PG[(Postgres 17<br/>RLS di setiap tabel)]
  REST --> PG
  RT --> PG
  SIM[simulator psql<br/>sim.tick tiap 45 dtk] --> PG
  NGINX[nginx :18120<br/>berkas statis] --> B
  subgraph Supabase lokal :18121 lewat gateway Kong
    AUTH
    REST
    RT
  end
```

Peramban membaca data lewat PostgREST dan menerima tiket baru serta perubahan status lewat Realtime.
Simulator (psql) menjalankan `sim.tick` tiap 45 detik. Arsitektur di Supabase cloud dijelaskan di
[docs/CLOUD.md](docs/CLOUD.md).

## Menjalankan

### Pratinjau tanpa instalasi

Buka `web/index.html?pratinjau` di peramban, atau galeri semua proyek di `../pratinjau.html`. Portal
memakai data contoh bawaan (mitra SMG).

### Demo teknis dengan Docker (opsional)

Demo ini butuh dua langkah: Supabase CLI, lalu docker compose.

```bash
# 1. Supabase lokal (layanan yang tidak dipakai dimatikan agar hemat memori)
npx supabase@3.0.0 start -x studio,postgres-meta,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,mailpit
#    migrasi di supabase/migrations dan seed.sql dijalankan otomatis pada start pertama

# 2. dasbor + simulator
cp .env.example .env
docker compose -p konsep-12 up -d
# buka http://localhost:18120 lalu masuk dengan akun contoh

# berhenti
docker compose -p konsep-12 stop
npx supabase@3.0.0 stop
```

Akun contoh (hanya emulator lokal, sandi semua akun `Contoh-Mitra-2026`):

| Email | Mitra |
|---|---|
| `mitra.smg@contoh.test` | Mitra Servis Semarang (SMG) |
| `mitra.sby@contoh.test` | Mitra Servis Surabaya (SBY) |
| `mitra.mks@contoh.test` | Mitra Servis Makassar (MKS) |

Mengulang data dari awal: `npx supabase@3.0.0 db reset` (menjalankan ulang migrasi dan seed).

## Konfigurasi

| Komponen | Teknologi | Port (hanya 127.0.0.1) |
|---|---|---|
| Dasbor (berkas statis) | nginx 1.27 | 18120 |
| Gateway API Supabase (Auth, REST, Realtime) | Supabase CLI 3.0.0 | 18121 |
| Postgres | `supabase/postgres` 17 | 18122 |
| Simulator | `postgres:17-alpine` (psql) | tanpa port |

Target peramban dipilih di `web/config.js`; target simulator lewat `SIM_DB_URL` di `.env`.

| Variabel | Set EMULATOR (bawaan) | Set CLOUD |
|---|---|---|
| `SIM_DB_URL` | `postgresql://postgres:postgres@host.docker.internal:18122/postgres` (nilai bawaan Supabase CLI lokal) | tidak dipakai: simulator tidak dijalankan di proyek produksi |
| `TICK_DETIK` | `45` | tidak dipakai |
| `SUPABASE_URL_CLOUD`, `SUPABASE_ANON_KEY_CLOUD` | kosong | URL dan kunci anon proyek klien (diisi juga di `web/config.js`) |
| `SUPABASE_DB_URL_CLOUD` | kosong | URL database proyek klien untuk migrasi |

## Struktur folder

```
docker-compose.yml   dasbor (nginx) + simulator; Supabase dijalankan terpisah lewat CLI
supabase/config.toml konfigurasi Supabase CLI (port 18121 dan 18122)
supabase/migrations/ skema + RLS, fungsi simulator
supabase/seed.sql    mitra, akun, unit, dan tiket contoh
uji-rls.sh           uji otomatis Row Level Security dengan curl + JWT
web/                 index.html, style.css, app.js, config.js, nginx.conf
docs/                API, DATABASE, DAFTAR-TITIK, DESAIN, CLOUD
```

## Keamanan

- **Row Level Security** aktif di semua tabel. Fungsi `mitra_saya()` membaca mitra dari JWT (`auth.uid()`).
- `anon` tidak punya hak apa pun pada tabel; semua data butuh login. Pendaftaran akun baru dimatikan
  (`enable_signup = false`), akun dibuat oleh admin pabrik.
- Pengguna login hanya boleh `UPDATE` kolom `status`, `ditanggapi_pada`, `jadwal_kunjungan`, `selesai_pada`
  pada tiket miliknya (hak per kolom + kebijakan `using`/`with check`).
- Kinerja dibandingkan dengan rata-rata semua mitra lewat fungsi `security definer` yang tidak mengembalikan
  nama atau angka per mitra lain.
- Unit pelanggan hanya memuat ID tersamar (`PLG-xxxxxx`), tanpa nama atau alamat.
- Kunci anon di `web/config.js` adalah kunci demo publik Supabase CLI lokal; untuk cloud diganti dengan kunci
  anon proyek klien (kunci anon memang dirancang publik, keamanan bergantung pada RLS).
- nginx mengirim header Content-Security-Policy yang membatasi skrip ke origin sendiri dan jsDelivr.

## Pengujian dan verifikasi

Verifikasi 5 November 2026 dengan Supabase CLI lokal:

| Uji | Hasil |
|---|---|
| `npx supabase@3.0.0 start` | migrasi 2 berkas + seed lulus; 75 unit, 221 tiket, 11 terbuka |
| `bash uji-rls.sh` | 9 pemeriksaan lulus (lihat di bawah) |
| Login lewat dasbor (Chrome headless + CDP) | portal SMG tampil, papan SLA terisi |
| Realtime | tiket baru untuk SMG muncul sebagai notifikasi di portal SMG dalam < 10 detik |
| Realtime lintas mitra | tiket SMG tidak memicu notifikasi di portal SBY |
| Mode `file://` | semua bagian terisi data contoh |
| sloplint | 0 FAIL; kontras teks redup 5,3:1, tombol 7,2:1 |

Isi `uji-rls.sh`: A hanya melihat 1 baris `mitra` miliknya; A membaca tiket dan unit B → `[]`; A mem-`PATCH`
tiket B → 0 baris berubah; anon membaca tiket → `401`; B mengubah kolom `mitra_id` → `403`; RPC
`kinerja_mitra` → `200`.

## Batasan dan langkah berikutnya

Proyek ini adalah pratinjau konsep. Autentikasi tingkat perusahaan, skala, backup, dan pemantauan produksi
berada di luar cakupan pratinjau dan perlu dirancang bila klien memilih proyek ini untuk dilanjutkan. Hal
yang perlu diperhatikan pada tahap itu:

- Atur ulang sandi lewat email: SMTP lokal dimatikan di demo; di cloud aktifkan SMTP Supabase.
- Simulator memakai akun `postgres` lokal; jangan dijalankan terhadap proyek produksi.
- Jadwal kunjungan saat menanggapi di demo ditetapkan besok pukul 09.00; pemilihan jadwal bebas belum dibuat.

## Dokumentasi terkait

- [docs/API.md](docs/API.md): kueri supabase-js, endpoint REST/RPC, Realtime, dan kode galat.
- [docs/DATABASE.md](docs/DATABASE.md): skema, kebijakan RLS, hak kolom, fungsi, dan retensi.
- [docs/DAFTAR-TITIK.md](docs/DAFTAR-TITIK.md): data yang dicatat: status tiket, prioritas, SLA, kinerja.
- [docs/DESAIN.md](docs/DESAIN.md): arah desain, token, dan keputusan tata letak.
- [docs/CLOUD.md](docs/CLOUD.md): arsitektur di Supabase cloud, langkah deploy, keamanan, dan biaya.
