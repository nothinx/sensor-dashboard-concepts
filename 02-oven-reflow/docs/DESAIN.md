# Desain · Monitor Oven Reflow SMT

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk**: alat kerja insinyur proses untuk memastikan profil suhu tiap lini sesuai resep, dan
  menemukan zona yang menyimpang beserta sebabnya.
- **Karakter**: teliti, eksak, dingin.
- **Dunia**: laboratorium metrologi, kertas grafik, pelat nama pada mesin.
- **Momen**: kurva 10 zona (aktual, setpoint putus-putus, pita toleransi kobalt pucat).
- **Tanda tangan**: pelat zona Z1 sampai Z10 di bawah kurva, berbingkai dengan dua titik paku seperti
  penanda pada badan oven; berubah merah saat zonanya keluar toleransi.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Latar terang netral, satu aksen kobalt | Dipakai lama di meja kerja; warna hanya untuk data dan status |
| Tab Line 1 / Line 2 di bilah atas | Tugas paling sering adalah berpindah lini; satu klik, di tempat yang tetap |
| Judul = temuan | "Line 2 menyimpang dari resep: zona 6 …" menjawab pertanyaan layar sebelum grafik dibaca |
| Panel zona fokus otomatis | Zona dengan selisih terbesar langsung diberi angka besar, rincian, dan tren |
| Tren 2 jam / 24 jam | Kejadian baru terlihat di 2 jam, pola berulang di 24 jam |
| Geist + Geist Mono | Humanis-teknis, angka tabular rapi untuk tabel setpoint |

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#fafafa` / `#ffffff` / `#f4f4f5` | Latar, panel, pelat |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#525252` / `#696969` | Teks (kontras ≥ 5,2:1) |
| `--accent` | `#1f4fbf` | Garis aktual, tab terpilih (7,2:1 di putih) |
| `--accent-tint` / `--accent-edge` | kobalt 8 % / 25 % | Pita toleransi |
| `--crit` / `--warn` | `#dc2626` / `#c98a00` | Zona keluar toleransi / mendekati batas |
| Radius | 12 px panel, 8 px kontrol, 3 px pelat | |

## Keadaan

| Keadaan | Tampilan |
|---|---|
| Memuat | Teks "Memuat kurva zona" di tiap panel, `aria-busy` |
| Sesuai resep | Judul "Line 1 sesuai resep di kesepuluh zona" + selisih terbesar |
| Belum ada papan uji | Panel profil menjelaskan papan uji lewat tiap 10 menit |
| API putus setelah sempat terhubung | Data terakhir tetap tampil + pita berisi jam data terakhir |
| API tidak terhubung sejak awal | Data contoh + pita berisi langkah menjalankan stack |
