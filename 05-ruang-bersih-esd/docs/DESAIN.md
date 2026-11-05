# Desain dasbor

Arah memakai format lima baris dari [unslop](https://github.com/heydamir/unslop) karya
Damir Sokolovsky (CC BY 4.0), digabung dengan panduan `design-guide`.

## Arah

- **Produk:** petugas QC memastikan setiap ruang produksi memenuhi syarat lingkungan dan kontrol ESD sebelum dan selama shift.
- **Karakter:** steril, teliti, ringan.
- **Dunia:** ruang bersih, jas lab, lantai epoksi bergaris kisi.
- **Momen:** denah lantai interaktif; titik sensor berwarna status, ruang bermasalah diberi garis tepi.
- **Tanda tangan:** blok "Uji gelang ESD hari ini" dengan ikon gelang, jumlah lulus, dan persentase lulus.

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
| `--bg` | `#f4f6f6` | latar halaman |
| `--surface` | `#ffffff` | panel |
| `--raised` | `#edf1f1` | latar denah |
| `--ink` / `--ink-2` / `--ink-3` | `#121a1c` / `#445055` / `#5b676c` | teks utama / sekunder / redup |
| `--accent` | `#0b6b61` | kode titik, pin terpilih, ikon gelang, fokus |
| `--s1` | `#0b7d71` | garis grafik |
| status | `#0ca30c`, `#fab219`, `#d03b3b`, chip tint + teks gelap se-hue | selalu ikon + teks |

Kontras terukur: `--ink-3` di atas `--bg` 5,38:1; aksen di atas putih ≥ 4,5:1.

Huruf: **DM Sans** 400/500/600 untuk antarmuka, **DM Mono** untuk angka, kode titik, dan waktu
(numeral tabular). Radius: panel 12, zona denah 6, logo 8. Spasi kelipatan 4 px.

## Keputusan

- Warna hanya muncul di denah (pin status) dan chip status; kerangka tetap netral.
- Status selalu ikon + teks; pin memakai kode jenis (TH, PC, DP, IO, ES) dan `aria-label` lengkap.
- Pin adalah `<button>` dengan `aria-pressed`, bisa dipilih dengan keyboard; target 32 px.
- State: memuat (teks "Memuat…"), kosong (riwayat belum ada), galat (pesan sebab + langkah), mode data contoh (pita).
- Gerak hanya pembesaran halus pin saat hover; dimatikan oleh `prefers-reduced-motion`.
