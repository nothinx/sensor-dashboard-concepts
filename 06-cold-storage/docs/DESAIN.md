# Desain dasbor

Arah memakai format lima baris dari [unslop](https://github.com/heydamir/unslop) karya
Damir Sokolovsky (CC BY 4.0), digabung dengan panduan `design-guide`.

## Arah

- **Produk:** petugas gudang bereaksi cepat saat material sensitif suhu atau kelembapan terancam rusak.
- **Karakter:** sigap, sederhana, jelas dari jarak dua meter.
- **Dunia:** ruang pendingin, tirai plastik pintu, label rak bernomor.
- **Momen:** pita suhu seperti termometer di setiap kartu ruang dingin: zona aman berwarna biru es, titik nilai sekarang.
- **Tanda tangan:** hitung mundur pintu terbuka ("tutup dalam 44 dtk", lalu "lewat batas 1 mnt 20 dtk").

Pertanyaan layar: *apakah ada material yang terancam sekarang?* Kalimat temuan menyebut masalah
paling mendesak lebih dulu, termasuk sisa waktu sebelum pintu melewati batas.

## Tata letak

```
┌ bilah atas 64 px: logo · nama · Data contoh · status koneksi MQTT ───────┐
├ judul + temuan (17 px, terbaca dari jarak) ──────────────────────────────┤
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

Huruf: **Figtree** 400/500/600 (ramah, bentuk huruf terbuka, terbaca dari jauh) dan
**Red Hat Mono** untuk kode ruang dan label skala. Nilai utama 80 px (64 px di HP) dan hitung mundur 36 px memakai
Figtree tabular, karena koma mono terlalu renggang di ukuran besar; lemari kering 40 px. Sudut siku, tepi 2 px
`--ink`, spasi kelipatan 4. Skala: isi 15 px, h1 40 px, temuan 20 px, `--chart-fs` 14 px.

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
