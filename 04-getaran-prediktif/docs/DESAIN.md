# Desain · Perawatan Prediktif Getaran

## Arah (format 5 baris unslop)

Format arah diadaptasi dari *unslop* karya Damir Sokolovsky (https://github.com/heydamir/unslop), lisensi CC BY 4.0.

| Baris | Isi |
|---|---|
| Produk | Alat bagi teknisi perawatan untuk memutuskan mesin mana yang diperiksa lebih dulu, dengan bukti dari spektrum |
| Karakter | teknis, sabar, analitis |
| Dunia | gambar teknik, lembar ukur, stetoskop mesin, ruang kompresor di shift malam |
| Momen | spektrum getaran: batang netral, garis cacat bearing (BPFO dan harmoniknya) menyala teal dengan penanda berlabel |
| Tanda tangan | stempel zona ISO A sampai D bergaris ganda, seperti cap revisi pada gambar teknik, di sidebar, judul, dan KPI |

Pertanyaan layar: *mesin mana yang harus diperiksa sekarang, dan apa buktinya?* Sidebar menjawab
"mesin mana" (urut dari yang paling perlu tindakan); kalimat temuan di bawah nama mesin menjawab "apa
buktinya" dengan menyebut frekuensi puncak spektrum.

## Tata letak

- Shell aplikasi: sidebar 264 px (latar paling gelap) + konten fluid, maksimal 1.600 px.
- Sidebar adalah navigasi sekaligus daftar prioritas: stempel zona, nama dan area, nilai RMS mono.
  Baris aktif memakai satu langkah permukaan dan sorot garis atas 1 px, tanpa pil berwarna.
- Kepala konten: stempel besar 56 px, nama mesin, temuan, satu aksi primer "Buat perintah kerja"
  (tombol putih pudar dengan teks gelap, sesuai tema gelap).
- Strip KPI dalam satu kontainer; getaran terkini paling besar (36 px).
- Spektrum penuh lebar sebagai grafik terbesar. Di bawahnya 7 : 5: tren 30 hari (garis, beda jenis
  dari spektrum) dan panel perintah kerja + identitas mesin.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--side` | `#0f0f10` | sidebar |
| `--bg` | `#141415` | latar konten |
| `--surface` | `#19191b` | panel |
| `--raised` | `#232325` | baris aktif, formulir |
| `--line` | `rgba(237,237,237,.08)` | garis rambut |
| `--ink` / `--ink-2` / `--ink-3` | `#ededed` / `#a1a1a6` / `#8e8e94` | tiga peran teks |
| `--accent` / `--s1` | `#3fbfab` | garis cacat di spektrum, garis tren (satu aksen) |
| `--accent-ink` | `#6fd6c4` | label BPFO, kode perintah kerja (10,1:1 di panel) |
| `--s3` | `#6a6a70` | batang spektrum biasa (3,27:1 di panel) |
| `--warn` / `--crit` | `#e2b340` / `#e5484d` | stempel zona C / D, garis batas zona di tren |

Latar tetap abu-abu graphite netral, bukan biru; nuansa "gambar teknik" dibawa oleh stempel, huruf mono,
dan garis putus-putus penanda frekuensi.

## Huruf

| Peran | Huruf | Alasan |
|---|---|---|
| Antarmuka, angka KPI | Space Grotesk 400/500/600 | geometris teknis, angka tabular rapi |
| Kode mesin, frekuensi, sumbu, nilai RMS di sidebar | Space Mono 400/700 | terasa seperti lembar ukur dan label gambar teknik |

## State

| Wilayah | Memuat | Kosong / galat | Penuh |
|---|---|---|---|
| Daftar mesin | `aria-busy`, "Memuat daftar mesin" | mode data contoh + pita kuning berisi sebab dan perintah menjalankan stack | daftar urut prioritas |
| Spektrum | - | "Tidak ada spektrum: sensor tidak mengirim data." | grafik + legenda |
| Tren | - | "Belum ada riwayat pengukuran untuk mesin ini." | grafik garis dengan batas zona C dan D |
| Perintah kerja | "Menyimpan perintah kerja" | "Belum ada perintah kerja"; galat validasi ditampilkan dengan langkah perbaikan | daftar |
| Mesin offline | - | stempel putus-putus "-", kalimat temuan menyebut jam data terakhir dan langkah memeriksa kabel atau gateway | - |
| Mode data contoh | - | tombol simpan dinonaktifkan dan diberi alasan | - |

## Pemeriksaan

- `sloplint web/index.html`: 0 FAIL (1 WARN: panel gelap mewarisi warna teks dari `body`, disengaja).
- Kontras: meta `--ink-3` 4,82:1 sampai 5,88:1; label aksen 10,1:1; chip peringatan 9,9:1; teks tombol primer 15,7:1.
- Dirender di 1920×1080: mesin dengan zona C, mesin offline, dan mode data contoh.
