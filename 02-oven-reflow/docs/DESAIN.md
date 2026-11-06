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
| Geist saja, Geist Mono dibuang (putaran 3) | Mono membuat koma desimal renggang ("0 , 75") dan terasa kasar; Geist punya x-height lega dan angka tabular, cukup untuk teks dan angka. Hanya bobot 400/500/600 dimuat |
| Kertas milimeter di bidang plot (putaran 2) | Kisi 8 px dan 40 px kobalt pucat di belakang kurva zona, tren zona, dan profil PCB; dunia laboratorium terlihat di tiga grafik, bukan satu |
| Tabel zona ditransposisi, kolom lurus di bawah titik kurva | Pelat Z1 sampai Z10 menjadi kepala kolom; kurva, pelat, dan angka dibaca vertikal per zona. Tabel tidak lagi terpotong di 1080 |
| Pelat nama mesin di header | Pelat logam berkeling empat berisi produk, lini, jumlah zona, dan resep aktif (resep pindah dari baris KPI) |
| Lembar bersudut tajam, garis tepi tegas, latar abu lab | Keluar dari rumpun "SaaS putih": struktur lembar gambar teknik, sudut 0 sampai 3 px, skala tipe naik |
| Skala tipe 13 / 15 / 17 / 20 / 28 / 40 / 64 px (token `--fs-1` sampai `--fs-7`, putaran 3) | Satu-satunya tempat ukuran huruf ditulis. Isi 17, label & tabel-kepala 15, sumbu/chip 13, judul temuan 28, angka jawaban KPI 40, angka zona fokus 64 (satu terbesar). Tracking negatif hanya ≥ 28 px, maks -0,02em |
| Dua kolom tetap (putaran 3) | Kiri: temuan, angka kunci 4 kolom, kurva + tabel; kanan (440 sampai 560 px): zona fokus dan profil papan. Muat 1920×1080 tanpa scroll; tinggi kurva mengisi sisa layar |
| Legenda kurva di ruang kiri sejajar label tabel (putaran 3) | Ruang kosong di kiri kurva terpakai; bilah judul tidak lagi pecah dua baris di 1440 |
| Baris fase ber-braket di atas pelat zona (putaran 3) | Menggantikan teks fase di dalam tiap pelat yang terpotong di 1440; dibaca seperti anotasi gambar teknik |
| Satuan diredam, spasi tipis (putaran 3) | Angka sans tabular, satuan 13 sampai 15 px abu; tanpa "m/mnt" dan "dtk", ditulis "m/menit" dan "detik" |
| Label likuidus dan batas toleransi pindah ke legenda di bawah grafik (putaran 3) | Label di dalam grafik menabrak puncak kurva |
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
| `--r` | 2 px | Satu radius untuk kontrol, chip, pelat; lembar 0 px |
| `--sp-1` sampai `--sp-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 px | Semua jarak |
| `--fs-1` sampai `--fs-7` | 13 / 15 / 17 / 20 / 28 / 40 / 64 px (HP: 28→24, 40→32, 64→48) | Semua ukuran huruf |
| `--side` | `clamp(440px, 30vw, 560px)` | Lebar kolom kanan |
| `--chart-font` / `--chart-fs` / `--tip-fs` / `--st-fs` | Geist / 13 px | Teks sumbu, tooltip, chip status |

## Keadaan

| Keadaan | Tampilan |
|---|---|
| Memuat | Teks "Memuat kurva zona" di tiap panel, `aria-busy` |
| Sesuai resep | Judul "Line 1 sesuai resep di kesepuluh zona" + selisih terbesar |
| Belum ada papan uji | Panel profil menjelaskan papan uji lewat tiap 10 menit |
| API putus setelah sempat terhubung | Data terakhir tetap tampil + pita berisi jam data terakhir |
| API tidak terhubung sejak awal | Data contoh + pita berisi langkah menjalankan stack |
