# 15 pratinjau konsep dasbor pemantauan sensor

Kumpulan 15 pratinjau konsep dasbor pemantauan sensor untuk klien. Tujuannya memberi klien pilihan
konsep yang berbeda dari sisi kebutuhan pengguna, tampilan, dan arsitektur data, sebelum satu konsep dipilih
untuk dikembangkan. **Ini pratinjau, bukan sistem produksi.**

## Melihat pratinjau

Pratinjau online: **https://sensor-dashboard-concepts.vercel.app** (repo: https://github.com/nothinx/sensor-dashboard-concepts).

Secara lokal, buka [`pratinjau.html`](pratinjau.html) di peramban. Setiap kartu membuka dasbor dengan data dummy
(`NN-nama/web/index.html?pratinjau`), tanpa instalasi, database, atau Docker.

Untuk tim teknis klien, setiap proyek juga punya **demo teknis opsional** dengan Docker: database, API, dan
simulator sensor sungguhan yang memperlihatkan arsitektur data yang diusulkan. Caranya ada di
[docs/PANDUAN-MENJALANKAN.md](docs/PANDUAN-MENJALANKAN.md).

> Semua angka sensor adalah **data contoh**. Logo, warna merek, dan data yang bergantung pada klien (tarif,
> baku mutu, resep, jadwal kalibrasi) masih placeholder dan ditandai `[REAL DATA: ...]`.

## Daftar konsep

### Database yang dipasang sendiri

| No | Konsep | Pengguna utama | Database | Cara menarik data | Backend demo |
|---|---|---|---|---|---|
| 01 | [Pusat Pemantauan Pabrik](01-pusat-pabrik/) | supervisor shift | PostgreSQL + TimescaleDB | REST + WebSocket push | Node.js Fastify |
| 02 | [Monitor Oven Reflow SMT](02-oven-reflow/) | insinyur proses | InfluxDB 2 | REST polling 5 detik | Python FastAPI |
| 03 | [Pemantauan Energi Listrik](03-energi-listrik/) | manajer fasilitas | SQLite | REST + ETag | Python pustaka standar |
| 04 | [Perawatan Prediktif Getaran](04-getaran-prediktif/) | teknisi perawatan | DuckDB + Parquet | GraphQL | Python Strawberry |
| 05 | [Ruang Bersih & ESD](05-ruang-bersih-esd/) | petugas QC | MongoDB | REST + Server-Sent Events | Node.js Express |
| 06 | [Gudang & Cold Storage](06-cold-storage/) | petugas gudang | Redis | MQTT lewat WebSocket | Mosquitto + Python |
| 07 | [NOC Perangkat & Gateway](07-noc-perangkat/) | teknisi IT/OT | Prometheus | PromQL HTTP API | exporter + nginx |
| 08 | [Laporan Kepatuhan Mutu](08-laporan-kepatuhan/) | manajer mutu | PostgreSQL | REST + OpenAPI, laporan async | Python FastAPI |
| 09 | [Armada AC Pintar](09-ac-pintar/) | tim purnajual | PostgreSQL | PostgREST | tanpa kode (SQL) |
| 10 | [IPAL & Emisi Lingkungan](10-ipal-lingkungan/) | petugas HSE | MariaDB | REST + webhook keluar | PHP Slim |

### Database cloud

Dalam demo teknis, kelima konsep ini dijalankan dengan **emulator resmi di Docker**, tanpa akun cloud dan tanpa
biaya. Langkah memindahkannya ke akun cloud milik klien ada di `docs/CLOUD.md` tiap proyek.

| No | Konsep | Pengguna utama | Layanan cloud | Cara menarik data |
|---|---|---|---|---|
| 11 | [Tugas Teknisi Lapangan](11-firebase-teknisi/) | teknisi (HP) | Firebase Firestore + Functions | listener real-time, offline |
| 12 | [Portal Mitra Servis](12-supabase-mitra/) | mitra servis | Supabase (Postgres + Auth + Realtime) | supabase-js, Row Level Security |
| 13 | [Genset & UPS Cabang](13-aws-genset-ups/) | tim fasilitas pusat | AWS IoT Core + DynamoDB + Lambda | API Gateway REST, paginasi |
| 14 | [Uji Akhir Lini Kulkas](14-azure-uji-kulkas/) | kepala lini | Azure IoT Hub + Cosmos DB + Functions | REST + long polling, change feed |
| 15 | [Jejak Mutu per Nomor Seri](15-atlas-jejak-mutu/) | insinyur mutu | MongoDB Atlas (time series + Search) | REST + Atlas Search |

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/PANDUAN-MENJALANKAN.md](docs/PANDUAN-MENJALANKAN.md) | cara melihat pratinjau, demo Docker, peta port, masalah yang dikenal |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | pola umum, pustaka bersama, perbandingan cara menarik data, keamanan dalam pratinjau |
| [docs/CATATAN-PROYEK.md](docs/CATATAN-PROYEK.md) | keputusan, status uji, hal di luar cakupan pratinjau, catatan per proyek |
| [docs/KEBUTUHAN-DATA-KLIEN.md](docs/KEBUTUHAN-DATA-KLIEN.md) | daftar data yang perlu diminta dari klien (dihasilkan otomatis) |
| [CHANGELOG.md](CHANGELOG.md) | riwayat perubahan |
| `NN-nama/README.md` | ringkasan, arsitektur, cara menjalankan, verifikasi, dan batasan tiap konsep |
| `NN-nama/docs/` | `API.md`, `DATABASE.md`, `DAFTAR-TITIK.md`, `DESAIN.md`, serta `CLOUD.md` untuk 11 sampai 15 |

## Struktur folder

| Path | Isi |
|---|---|
| `pratinjau.html`, `pratinjau/` | galeri pratinjau dan gambar kartunya |
| `NN-nama/` | satu konsep: `web/`, `api/`, `simulator/`, `db/`, `docs/`, `docker-compose.yml` |
| `shared/` | pustaka grafik bersama, brief pembuatan, alat bantu dokumentasi |
| `docs/` | dokumentasi lintas proyek |
| `_draf-10-layar/` | draf awal (10 layar satu sistem), disimpan sebagai arsip |

## Prinsip desain

Arah tiap konsep ditulis dalam lima baris (produk, karakter, dunia, momen, tanda tangan) mengikuti format
[unslop](https://github.com/heydamir/unslop) karya Damir Sokolovsky (CC BY 4.0), digabung dengan panduan desain
internal: latar netral, satu aksen, warna hanya pada bagian yang bermakna, status selalu berupa ikon dan teks,
serta bahasa Indonesia sesuai EYD V.
