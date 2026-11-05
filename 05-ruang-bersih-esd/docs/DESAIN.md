# Desain dasbor

Arah memakai format lima baris dari [unslop](https://github.com/heydamir/unslop) karya
Damir Sokolovsky (CC BY 4.0), digabung dengan panduan `design-guide`.

## Arah

- **Produk:** petugas QC memastikan setiap ruang produksi memenuhi syarat lingkungan dan kontrol ESD sebelum dan selama shift.
- **Karakter:** steril, teliti, ringan.
- **Dunia:** ruang bersih, jas lab, lantai epoksi bergaris kisi.
- **Momen:** denah lantai interaktif; titik sensor berwarna status, ruang bermasalah diberi garis tepi.
- **Tanda tangan:** label gantung teal "Uji gelang ESD hari ini" dengan ikon gelang, angka lulus 56 px, batang lulus/gagal, dan persentase lulus.

Pertanyaan layar: *apakah semua ruang memenuhi syarat sekarang?* Jawabannya ada di kalimat temuan
di bawah judul, dihitung otomatis dari status titik.

## Tata letak

```
┌ bilah atas: logo · nama produk · Data contoh · status koneksi ───────────┐
│ pita mode data contoh (hanya bila API tidak terhubung)                   │
├ judul + temuan ─────────────────────────────── tanda tangan uji ESD ─────┤
├ denah titik sensor (2/3) ──────────────┬ detail titik terpilih (1/3) ────┤
│                                         │ nilai, ambang, grafik 24 jam   │
├ syarat per ruang (7/12) ───────────────┴ uji gelang terakhir (5/12) ─────┤
```
Di bawah 1100 px semua kolom ditumpuk.

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` | `#eef2f1` | latar halaman, berkisi 48 px (`--kisi`) |
| `--epoksi` | `#e4ecea` | lantai ruang di denah, kisi 16 px |
| `--dinding` | `#2a3436` | dinding denah, tebal `--tebal` 6 px (4 px di HP) |
| `--on-accent` / `--on-accent-2` | `#f7fbfa` / `#cfe8e4` | teks di label ESD (6,12:1 / 4,96:1) |
| `--surface` | `#fcfdfd` | panel, koridor denah |
| `--raised` | `#edf1f1` | latar denah |
| `--ink` / `--ink-2` / `--ink-3` | `#121a1c` / `#445055` / `#56636a` | teks utama / sekunder / redup |
| `--accent` | `#0b6b61` | kode titik, pin terpilih, ikon gelang, fokus |
| `--s1` | `#0b7d71` | garis grafik |
| status | `#0ca30c`, `#fab219`, `#d03b3b`, chip tint + teks gelap se-hue | selalu ikon + teks |

Kontras terukur: `--ink-3` di atas `--bg` 5,49:1, di atas `--epoksi` 5,16:1; aksen di atas putih ≥ 4,5:1.

Huruf: **DM Sans** 400/500/600 untuk antarmuka, **DM Mono** untuk angka, kode titik, dan waktu
(numeral tabular). Sudut siku di semua permukaan (pin tetap bulat). Spasi kelipatan 4 px.
Skala: isi 15 px, label 13 sampai 14 px, h1 40 px, nilai detail 36 px, `--chart-fs` 13 px.

## Keputusan

- Warna hanya muncul di denah (pin status) dan chip status; kerangka tetap netral.
- Status selalu ikon + teks; pin memakai kode jenis (TH, PC, DP, IO, ES) dan `aria-label` lengkap.
- Pin adalah `<button>` dengan `aria-pressed`, bisa dipilih dengan keyboard; target 32 px.
- State: memuat (teks "Memuat…"), kosong (riwayat belum ada), galat (pesan sebab + langkah), mode data contoh (pita).
- Gerak hanya pembesaran halus pin saat hover; dimatikan oleh `prefers-reduced-motion`.

## Keputusan putaran 2

- Penanda tunggal `data-pratinjau` di bilah atas. Saat `PRATINJAU`, status koneksi "Pratinjau tanpa API" netral; teks "data contoh" di footer dihapus.
- Permukaan bukan kartu: satu lembar menyatu, panel dipisah garis kisi 1 px, sudut siku, latar halaman berkisi seperti lantai epoksi.
- Konten selebar layar (tanpa batas 1.600 px); denah 3 : 1 terhadap panel detail.
- Denah sebagai gambar arsitektur: dinding 6 px, lantai epoksi berkisi, pintu berupa celah dinding + daun + busur ayun menghadap koridor, airlock punya pintu kedua ke luar, panah utara dan skala batang (`[REAL DATA: gambar denah klien]`).
- Ruang bermasalah diberi garis dalam 3 px warna status plus chip ikon + teks di label ruang.
- Tiap titik sensor berlabel ID mono; label pindah ke kiri bila dekat dinding kanan. Di HP label, nilai ruang, dan pintu disembunyikan; ID tetap ada di panel detail.
