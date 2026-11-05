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
| Kertas milimeter di bidang plot (putaran 2) | Kisi 8 px dan 40 px kobalt pucat di belakang kurva zona, tren zona, dan profil PCB; dunia laboratorium terlihat di tiga grafik, bukan satu |
| Tabel zona ditransposisi, kolom lurus di bawah titik kurva | Pelat Z1 sampai Z10 menjadi kepala kolom; kurva, pelat, dan angka dibaca vertikal per zona. Tabel tidak lagi terpotong di 1080 |
| Pelat nama mesin di header | Pelat logam berkeling empat berisi produk, lini, jumlah zona, dan resep aktif (resep pindah dari baris KPI) |
| Lembar bersudut tajam, garis tepi tegas, latar abu lab | Keluar dari rumpun "SaaS putih": struktur lembar gambar teknik, sudut 0 sampai 3 px, skala tipe naik |
| Skala tipe 13 / 15 / 16 / 18 / 32 / 48 / 72 px | Isi 16 px, label 15 px, angka zona fokus 72 px; muat 1920×1080 tanpa scroll, kanvas penuh tanpa batas 1600 px |
| Penanda pratinjau tunggal | Chip `data-pratinjau` "Pratinjau, data contoh"; status menjadi "Pembacaan pukul 14.32"; footer dihapus |

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#e9ecef` / `#fcfdff` / `#f2f3f5` | Latar abu lab, lembar, kontrol |
| `--mm` / `--mm-major` | kobalt 6 % / 15 % | Kertas milimeter |
| `--metal-1` / `--metal-2` / `--rivet` | `#f4f5f7` / `#d9dce1` / `#7d838c` | Pelat nama dan pelat zona |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#4a4d52` / `#61656b` | Teks (kontras ≥ 4,9:1 di latar abu, 5,9:1 di lembar) |
| `--accent` | `#1f4fbf` | Garis aktual, tab terpilih (7,2:1 di putih) |
| `--accent-tint` / `--accent-edge` | kobalt 8 % / 25 % | Pita toleransi |
| `--crit` / `--warn` | `#dc2626` / `#c98a00` | Zona keluar toleransi / mendekati batas |
| Radius | 0 px lembar, 2 px kontrol, 3 px pelat nama | |
| `--chart-fs` | 14 px (11 px di HP) | Teks sumbu grafik |

## Keadaan

| Keadaan | Tampilan |
|---|---|
| Memuat | Teks "Memuat kurva zona" di tiap panel, `aria-busy` |
| Sesuai resep | Judul "Line 1 sesuai resep di kesepuluh zona" + selisih terbesar |
| Belum ada papan uji | Panel profil menjelaskan papan uji lewat tiap 10 menit |
| API putus setelah sempat terhubung | Data terakhir tetap tampil + pita berisi jam data terakhir |
| API tidak terhubung sejak awal | Data contoh + pita berisi langkah menjalankan stack |
