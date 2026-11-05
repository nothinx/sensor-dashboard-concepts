# Panduan melihat pratinjau

Ke-15 proyek adalah **pratinjau konsep** untuk klien, bukan sistem produksi. Cara utama melihatnya adalah galeri
pratinjau, yang tidak butuh instalasi apa pun. Backend Docker hanya demo teknis opsional untuk memperlihatkan
arsitektur data yang diusulkan. Detail khusus tiap proyek ada di `NN-nama/README.md`.

## Tiga cara melihat dasbor

| Cara | Kebutuhan | Data yang tampil | Untuk apa |
|---|---|---|---|
| **Galeri pratinjau (utama)** | peramban saja | data dummy bawaan | presentasi ke klien, memilih konsep |
| Buka `web/index.html` langsung | peramban saja | data dummy + pita "API tidak terhubung" | memeriksa tampilan saat koneksi putus |
| Demo teknis dengan Docker (opsional) | Docker Desktop | data simulator lewat database dan API | memperlihatkan arsitektur yang diusulkan kepada tim teknis klien |

### 1. Galeri pratinjau

Versi online: https://sensor-dashboard-concepts.vercel.app. Secara lokal, buka `pratinjau.html` di folder induk. Setiap kartu membuka `NN-nama/web/index.html?pratinjau`. Parameter
`?pratinjau` ditangani `shared/charts.js`: pita galat koneksi disembunyikan dan diganti label
"Pratinjau · data dummy, tidak terhubung ke API".

### 2. Demo teknis dengan Docker (opsional)

Prasyarat: Docker Desktop dengan backend WSL2 dan Node.js 20 atau lebih baru (hanya untuk proyek 12).

```bash
cd 01-pusat-pabrik
cp .env.example .env            # sekali saja; isi default sudah cukup untuk lokal
docker compose -p konsep-01 up -d --build
# buka http://localhost:18010
docker compose -p konsep-01 stop
```

Ganti `01` dengan nomor proyek. Perintah `stop` menyimpan data di volume; data simulator tetap ada saat stack
dinyalakan lagi. Untuk menghapus data uji sekaligus volumenya: `docker compose -p konsep-NN down -v`.

**Pengecualian proyek 12 (Supabase):** jalankan Supabase CLI lebih dulu, lalu compose untuk dasbor dan
simulator. Urutan persisnya ada di `12-supabase-mitra/README.md`.

## Peta port

Setiap proyek memakai rentang `18NN0` sampai `18NN9`, jadi beberapa proyek bisa jalan bersamaan. Port selain
dasbor hanya terbuka di `127.0.0.1`.

| No | Proyek | Dasbor | Port lain |
|---|---|---|---|
| 01 | Pusat Pemantauan Pabrik | 18010 | 18011 PostgreSQL |
| 02 | Monitor Oven Reflow SMT | 18020 | 18021 UI InfluxDB |
| 03 | Pemantauan Energi Listrik | 18030 | |
| 04 | Perawatan Prediktif Getaran | 18040 | |
| 05 | Ruang Bersih & ESD | 18050 | 18051 MongoDB |
| 06 | Gudang & Cold Storage | 18060 | 18061 MQTT, 18062 MQTT lewat WebSocket, 18063 Redis |
| 07 | NOC Perangkat & Gateway | 18070 | 18071 UI Prometheus, 18072 exporter |
| 08 | Laporan Kepatuhan Mutu | 18080 | 18081 PostgreSQL |
| 09 | Armada AC Pintar | 18090 | 18091 PostgreSQL, 18092 PostgREST |
| 10 | IPAL & Emisi Lingkungan | 18100 | 18101 MariaDB, 18102 API, 18103 penerima webhook |
| 11 | Tugas Teknisi Lapangan | 18110 | 18111 Firestore, 18112 Auth, 18113 Functions, 18114 UI emulator |
| 12 | Portal Mitra Servis | 18120 | 18121 gateway Supabase, 18122 PostgreSQL |
| 13 | Genset & UPS Cabang | 18130 | 18131 DynamoDB Local, 18132 adaptor API Gateway |
| 14 | Uji Akhir Lini Kulkas | 18140 | 18141 gateway emulator Cosmos DB, 18142 Data Explorer |
| 15 | Jejak Mutu per Nomor Seri | 18150 | 18151 Atlas Local |

## Memori

Memori WSL di mesin pengembangan 8 GB. Jalankan dua atau tiga proyek sekaligus saja. Proyek 12 (Supabase,
sekitar sepuluh container) dan 14 (emulator Cosmos DB, dibatasi 2 GB) sebaiknya dijalankan sendirian. Batas
memori WSL diatur di `%UserProfile%\.wslconfig`; setelah mengubahnya jalankan `wsl --shutdown`.

## Masalah yang sudah dikenal

| Gejala | Sebab | Langkah |
|---|---|---|
| Dasbor 07 menampilkan seri ganda di Prometheus | volume menyimpan backfill lama tanpa label `job` | `docker compose -p konsep-07 down -v` lalu `up -d` |
| Perubahan kode API tidak terlihat | kode disalin ke image saat build | `up -d --build`, bukan sekadar restart |
| Dasbor kosong dengan pita kuning | stack mati atau port dipakai program lain | `docker compose -p konsep-NN ps`, periksa log layanan `api` |
| Tangkapan layar headless kosong | Edge headless keluar sebelum menulis berkas; halaman SSE/MQTT tak pernah "selesai" | pakai Chrome `--headless=new --timeout=7000`, atau skrip CDP di catatan proyek |

## Pratinjau online (Vercel)

Situs https://sensor-dashboard-concepts.vercel.app hanya memuat bagian statis: `pratinjau.html`, `pratinjau/`, `shared/charts.*`, dan folder `web/`
tiap proyek (diatur `.vercelignore`); alamat `/` diarahkan ke galeri oleh `vercel.json`. Kode API, simulator,
dan dokumen tidak ikut diunggah. Dengan `?pratinjau`, dasbor tidak menghubungi API sama sekali (`TANPA_API` di
`shared/charts.js`).

```bash
vercel deploy --prod      # dari folder induk; proyek Vercel sudah ditautkan di .vercel/
```

## Memperbarui pratinjau dan daftar kebutuhan data

```bash
python shared/alat/kumpulkan_real_data.py     # tulis ulang docs/KEBUTUHAN-DATA-KLIEN.md
```

Gambar kartu galeri ada di `pratinjau/NN.jpg` (960 × 540, diambil dari mode `?pratinjau` pada 1920 × 1080).
