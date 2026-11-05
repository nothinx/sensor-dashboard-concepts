# Desain · Armada AC Pintar

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Tim layanan purnajual melihat AC pelanggan mana yang perlu servis sebelum pelanggan komplain.
- **Karakter.** Hangat, membantu, ringkas.
- **Dunia.** Rumah pelanggan dan kunjungan servis: dinding ruang tamu, unit putih di atas pintu, kertas tiket teknisi.
- **Momen.** Unit AC digambar dengan CSS: layar kecil menunjukkan suhu ruang atau kode galat, lampu status, dan
  aliran udara yang memudar atau berubah warna saat pendinginan lemah.
- **Tanda tangan.** Kartu tiket servis dengan lekuk sobekan dan garis putus-putus. Muncul hanya di panel detail.

## Pertanyaan layar

"Unit mana yang perlu saya hubungi pelanggannya hari ini?" Jawaban terbesar: jumlah unit bermasalah **tanpa
tiket** (KPI pertama, warna aksen). Temuan di bawah judul menyebut jumlahnya dalam kalimat.

## Tata letak

Putaran 2: satu lembar menyatu bersekat garis. Kolom kiri 380 px berisi daftar unit bermasalah, lalu per kota
dan kode galat; kolom kanan (sisa lebar) adalah detail unit, yaitu momen. Sel KPI pertama sejajar dengan kolom
kiri. Di bawah 1700 px tiket turun ke bawah adegan; di bawah 1100 px semua bertumpuk.

## Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | `#f6f3ee` / `#fdfbf8` / `#efe9e0` | permukaan netral hangat tipis |
| `--ink` / `--ink-2` / `--ink-3` | `#1f1b16` / `#554c41` / `#6e655a` | tiga peran teks (redup 5,2:1 pada latar) |
| `--accent` | `#b5481f` terakota | angka jawaban, tiket, batang per kota (5,2:1 pada surface) |
| `--s1` / `--s2` / `--s3` | terakota / abu / hijau tua | suhu ruang / suhu set / arus & tekanan |
| status | `--good` `--warn` `--crit` + pasangan `-bg`/`-ink` | chip status selalu ikon + teks |
| radius | lembar 4 px, kontrol 4 px, tiket dan adegan 2 px | keluar dari rumpun kartu 8 sampai 14 px |
| `--dinding` / `--plin` / `--lantai-1` | `#ece3d4` / `#cdbfa8` / `#b98d62` | adegan rumah di detail unit |
| `--pelat` / `--pelat-teks` | `#2c2621` / `#f3ede4` | ID unit sebagai pelat nomor rumah (12,83:1) |
| `--tiket` / `--tiket-garis` | `#fbf1cc` / `#d9c88c` | kertas tiket rangkap kuning (teks redup 5,05:1) |
| skala tipe (1920) | isi 15, label 13, temuan 18, alasan 20, h1 36, ID unit 28, angka 32, jawaban 48 | `--chart-fs` 13 |
| gerak | `cubic-bezier(0.22, 1, 0.36, 1)`, 120 sampai 150 ms | hover warna, tekan skala 0,98 |

Huruf: **Plus Jakarta Sans** (rancangan Indonesia, ramah, angka tabular) untuk antarmuka;
**JetBrains Mono** untuk ID unit, kode pelanggan, dan sumbu grafik.

## Keputusan

- Warna aksen hanya di angka jawaban, tiket, dan batang per kota. Latar tetap netral.
- Status selalu ikon + teks (`Kritis`, `Perlu servis`, `Offline`), tidak hanya warna.
- Gambar unit dibuat dengan CSS, bukan foto atau ilustrasi generatif, supaya ringan dan statusnya hidup.
  Slot `[LOGO]` di badan unit menunggu aset merek.
- Tombol aksi utama memfilter daftar ke unit tanpa tiket (aksi paling sering), bukan menulis ke database.
- **Putaran 2, rumah di lebih banyak permukaan**: unit AC diperbesar (tinggi 124 px, layar 26 px) dan dipasang di
  adegan dinding plester dengan list plafon, plin, dan lantai kayu; ID unit di daftar tampil sebagai pelat nomor
  rumah; tiket memakai kertas rangkap kuning teknisi.
- **Putaran 2, struktur permukaan**: tidak ada kartu putih melayang. KPI dan tiga wilayah berada dalam satu
  lembar bersekat garis 1 px, sel KPI jawaban diberi latar aksen lembut.
- **Putaran 2, pratinjau**: satu penanda `data-pratinjau` di header ("Pratinjau, data contoh"); status sumber
  netral ("Diperbarui pukul …"), bukan "Data contoh bawaan".

## Hasil pemeriksaan

- sloplint putaran 2: 0 FAIL, 1 REFLEX (`.tip` milik `shared/charts.css`), 0 WARN.
- Render 1920×1080 dan 390×844 `?pratinjau` di Chrome headless: tanpa galat konsol, tanpa geser samping.
