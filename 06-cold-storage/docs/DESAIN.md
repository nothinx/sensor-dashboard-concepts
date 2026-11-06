# Desain dasbor

Arah memakai format lima baris dari [unslop](https://github.com/heydamir/unslop) karya
Damir Sokolovsky (CC BY 4.0), digabung dengan panduan `design-guide`.

## Arah

- **Produk:** petugas gudang bereaksi cepat saat material sensitif suhu atau kelembapan terancam rusak.
- **Karakter:** sigap, sederhana, jelas dari jarak dua meter.
- **Dunia:** ruang pendingin, tirai plastik pintu, label rak bernomor.
- **Momen:** pita suhu seperti termometer di setiap kartu ruang dingin: zona aman berwarna biru es, titik nilai sekarang.
- **Tanda tangan:** hitung mundur pintu terbuka ("tutup dalam 44 detik", lalu "lewat batas 1 menit 20 detik").

Pertanyaan layar: *apakah ada material yang terancam sekarang?* Kalimat temuan menyebut masalah
paling mendesak lebih dulu, termasuk sisa waktu sebelum pintu melewati batas.

## Tata letak

```
┌ bilah atas 64 px: logo · nama · Data contoh · status koneksi MQTT ───────┐
├ judul 28 px + temuan 20 px (terbaca dari jarak) ──────────────────────────────┤
├ 3 kartu besar: Cold storage A · Cold storage B · Freezer ────────────────┤
├ 6 kartu lemari kering (RH + batang terhadap batas 5 %) ──────────────────┤
├ riwayat 24 jam ruang terpilih (2/3) ───────┬ gudang umum (1/3) ──────────┤
```
Kartu adalah tombol besar (≥ 48 px, sasaran sentuh sarung tangan); menekan kartu memilih ruang
untuk grafik riwayat. Grid kartu menyesuaikan lebar (`auto-fit`), sehingga di tablet potret kartu
turun menjadi 1 sampai 2 kolom.

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#f5f7fa` / `#fcfdfe` / `#eceff4` | ramp "ink" netral sejuk |
| `--ink` / `--ink-2` / `--ink-3` | `#111827` / `#4b5565` / `#5f6879` | teks |
| `--accent` | `#0a5a8f` | kartu terpilih, titik termometer, fokus |
| `--safe` | `#d8ecf8` | zona aman termometer, bergaris skala 12 px |
| `--tirai` / `--tirai-2` | biru aksen 16 % / 32 % | tirai plastik pintu di kartu yang pintunya terbuka |
| `--hover` | `#f3f6fa` | hover kartu |
| `--s1` | `#1f6fd1` | garis grafik, isi batang RH |
| status | hijau, kuning, merah tetap; chip tint + teks gelap se-hue | selalu ikon + teks |

Kontras terukur: `--ink-3` di atas `--bg` 5,23:1; aksen di atas putih 7,31:1; `--ink-2` di atas `--raised` 6,54:1.

Huruf: **Public Sans** 400/500/600 saja, satu keluarga untuk teks, angka, kode ruang, dan sumbu grafik
(`--chart-font`). Angka memakai `tabular-nums lining-nums`; satuan dipisah `&thinsp;`, lebih kecil dan abu.
Sudut siku, tepi label 2 px `--ink` (`--garis`), garis pemisah 1 px `--line`.

| Token | Nilai | Pemakaian |
|---|---|---|
| `--t-1` … `--t-7` | 13 / 15 / 17 / 20 / 28 / 40 / 80 px (HP: t-4 17, t-5 24, t-6 32, t-7 64) | label & sumbu / isi / judul kartu / judul bagian & temuan / h1 & satuan suhu / hitung mundur, RH, gudang umum / angka suhu |
| `--sp-1` … `--sp-7` | 4 / 8 / 12 / 16 / 24 / 32 / 40 px | semua jarak; antarbagian 40 |
| `--pad-besar` / `--pad-kecil` | 24 / 16 px (HP 16 / 12) | padding kartu ruang / lemari |
| `--chart-fs`, `--tip-fs`, `--st-fs` | `--t-1` | grafik, tooltip, chip status |

`grep -E "font-size: *[0-9]" web/style.css` kosong di luar `:root`.

## Keputusan

- Kartu ber-status kritis/peringatan diberi garis atas 4 px, bukan latar berwarna penuh, supaya kerangka tetap tenang.
- Isi kartu diperbarui di tempat (bukan dibangun ulang) setiap detik, sehingga fokus keyboard tidak hilang saat hitung mundur berjalan.
- Status selalu ikon + teks; batang RH punya garis batas 5 % dan angka di atasnya.
- State: menghubungkan, langsung (MQTT), polling (pita sebab), mode data contoh (pita), riwayat memuat/kosong/galat.
- Gerak hanya transisi warna tepi kartu; dimatikan oleh `prefers-reduced-motion`.

## Keputusan putaran 2

- Penanda tunggal `data-pratinjau` di bilah atas. Saat `PRATINJAU`, status koneksi "Pratinjau tanpa API" netral; teks "data contoh" di footer dihapus.
- Kartu menjadi label pintu atau rak: tepi 2 px hitam, sudut siku, kode ruang (CS-A, DC-01) terbalik putih di atas hitam di kiri atas.
- Angka suhu 80 px agar terbaca dari 2 m (patokan ≥ 64 px). Termometer 24 px dengan bola 40 px, zona aman bergaris skala, penanda nilai berupa jarum 6 px.
- Pintu terbuka: strip tirai plastik di atas kartu, hitung mundur 36 px di blok berwarna status yang menempel di dasar kartu.
- Status kartu: tepi warna status (peringatan cokelat tua, kritis merah, offline putus-putus), tetap dengan chip ikon + teks.
- Konten selebar layar (tanpa batas 1.600 px).

## Keputusan putaran 3

| Keputusan | Alasan |
|---|---|
| Figtree + Red Hat Mono → **Public Sans** saja | x-height lega, angka tabular rapi, bentuk huruf papan informasi publik (cocok dengan label rak). Mono dibuang: kode ruang dan label skala cukup sans 600; satu keluarga = lebih tenang. |
| Satu skala tipe 7 langkah di `:root`, tanpa px lepas | Sebelumnya 14 ukuran berbeda (12 sampai 80). Satu hal terbesar per layar tetap angka suhu 80 px. |
| Tracking negatif hanya ≥ 28 px, maks -0,02em | Teks kecil tidak lagi menempel. |
| Blok pintu selalu ada, selebar kartu, tinggi tetap (96 px; lemari 72 px) | Kartu yang pintunya tertutup tidak lagi punya ruang kosong menggantung; tinggi tidak melompat saat pintu dibuka. Nilai hitung mundur 40 px, keterangan di atasnya. |
| Tirai plastik absolut di tepi atas | Isi kartu yang pintunya terbuka tetap sejajar dengan tetangganya. |
| Kartu lemari: judul = isi lemari, keterangan = lokasi; chip status di bawah kode | "DC-01" + "Lemari kering DC-01" berulang; chip panjang tidak lagi terlipat tak menentu. |
| Baris angka bertinggi tetap | "Tidak ada data" tidak menggeser termometer atau batang RH. |
| Satuan waktu ditulis penuh ("4 menit 19 detik"), angka-satuan dengan nbsp | "mnt"/"dtk" bukan singkatan lazim di UI. |
| Satu istilah: "cold storage" (judul bagian, produk); "Offline" → "Terputus sejak 14.32" / "Belum ada data" | Tidak mencampur "ruang dingin" dan "cold storage"; tanpa kata Inggris di status. |
| Penanda data contoh disembunyikan saat data langsung; di pratinjau status koneksi disembunyikan | Sebelumnya "Data contoh" tampil juga saat MQTT hidup, dan pratinjau punya dua penanda yang sama. |
| Data contoh dirapikan ("Driver LED", "Driver panel LCD", "dekat Line 1") | Urutan kata Indonesia. Data dari API asli tetap mengikuti basis data. |
