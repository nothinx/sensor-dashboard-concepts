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
| `--bg` / `--surface` / `--raised` | `#f5f7fa` / `#ffffff` / `#eceff4` | ramp "ink" netral sejuk |
| `--ink` / `--ink-2` / `--ink-3` | `#111827` / `#4b5565` / `#5f6879` | teks |
| `--accent` | `#0a5a8f` | kartu terpilih, titik termometer, fokus |
| `--safe` | `#d8ecf8` | zona aman termometer |
| `--s1` | `#1f6fd1` | garis grafik, isi batang RH |
| status | hijau, kuning, merah tetap; chip tint + teks gelap se-hue | selalu ikon + teks |

Kontras terukur: `--ink-3` di atas `--bg` 5,23:1; aksen di atas putih 7,31:1; `--ink-2` di atas `--raised` 6,54:1.

Huruf: **Figtree** 400/500/600 (ramah, bentuk huruf terbuka, terbaca dari jauh) dan
**Red Hat Mono** untuk angka. Nilai utama 36 px, lemari kering 28 px. Radius kartu 16, spasi kelipatan 4.

## Keputusan

- Kartu ber-status kritis/peringatan diberi garis atas 4 px, bukan latar berwarna penuh, supaya kerangka tetap tenang.
- Isi kartu diperbarui di tempat (bukan dibangun ulang) setiap detik, sehingga fokus keyboard tidak hilang saat hitung mundur berjalan.
- Status selalu ikon + teks; batang RH punya garis batas 5 % dan angka di atasnya.
- State: menghubungkan, langsung (MQTT), polling (pita sebab), mode data contoh (pita), riwayat memuat/kosong/galat.
- Gerak hanya transisi warna tepi kartu; dimatikan oleh `prefers-reduced-motion`.
