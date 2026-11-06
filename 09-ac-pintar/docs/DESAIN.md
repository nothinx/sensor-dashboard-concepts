# Desain · Armada AC Pintar

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Tim layanan purnajual melihat AC pelanggan mana yang perlu servis sebelum pelanggan komplain.
- **Karakter.** Hangat, membantu, ringkas.
- **Dunia.** Rumah pelanggan dan kunjungan servis: dinding ruang tamu, unit putih di atas pintu, kertas tiket teknisi.
- **Momen.** Unit AC digambar dengan CSS: layar kecil menunjukkan suhu ruang atau kode gangguan, lampu status, dan
  aliran udara yang memudar atau berubah warna saat pendinginan lemah.
- **Tanda tangan.** Kartu tiket servis dengan lekuk sobekan dan garis putus-putus. Muncul hanya di panel detail.

## Pertanyaan layar

"Unit mana yang perlu saya hubungi pelanggannya hari ini?" Jawaban terbesar: jumlah unit bermasalah **tanpa
tiket** (KPI pertama, warna aksen). Temuan di bawah judul menyebut jumlahnya dalam kalimat.

## Tata letak

Putaran 2: satu lembar menyatu bersekat garis. Kolom kiri 380 px berisi daftar unit bermasalah, lalu per kota
dan kode gangguan; kolom kanan (sisa lebar) adalah detail unit, yaitu momen. Sel KPI pertama sejajar dengan kolom
kiri. Putaran 3: detail dibuka kepala unit (ID, status, alasan) selebar kolom, lalu adegan | fakta | tiket.
Di bawah 1700 px: adegan | tiket, fakta turun ke kisi selebar kolom; di bawah 1100 px semua bertumpuk.

## Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | `#f6f3ee` / `#fdfbf8` / `#efe9e0` | permukaan netral hangat tipis |
| `--ink` / `--ink-2` / `--ink-3` | `#1f1b16` / `#554c41` / `#6e655a` | tiga peran teks (redup 5,2:1 pada latar) |
| `--accent` | `#b5481f` terakota | angka jawaban, tiket, batang per kota (5,2:1 pada surface) |
| `--s1` / `--s2` / `--s3` | terakota / abu / hijau tua | suhu ruang / suhu set / arus & tekanan |
| status | `--good` `--warn` `--crit` + pasangan `-bg`/`-ink` | chip status selalu ikon + teks |
| radius | `--r` 4 px untuk semua (lembar, kontrol, chip, pelat, tiket, adegan) | badan AC tetap bentuk ilustrasi |
| spasi | `--sp-1..7` = 4 / 8 / 12 / 16 / 24 / 32 / 48 px, `--gutter` 32 (16 di HP) | tinggi kontrol `--ctl-h` 44 px |
| `--dinding` / `--plin` / `--lantai-1` | `#ece3d4` / `#cdbfa8` / `#b98d62` | adegan rumah di detail unit |
| `--pelat` / `--pelat-teks` | `#2c2621` / `#f3ede4` | ID unit sebagai pelat nomor rumah (12,83:1) |
| `--tiket` / `--tiket-garis` | `#fbf1cc` / `#d9c88c` | kertas tiket rangkap kuning (teks redup 5,05:1) |
| skala tipe `--fs-1..7` | 13 / 15 / 17 / 20 / 28 / 40 / 56 (HP: langkah 5 sampai 7 = 24 / 30 / 48) | label·isi·temuan & judul panel·alasan·ID unit & angka KPI·h1·jawaban; `--chart-fs`, `--tip-fs`, `--st-fs` = `--fs-1`, `--chart-font` sans |
| gerak | `cubic-bezier(0.22, 1, 0.36, 1)`, 120 sampai 150 ms | hover warna, tekan skala 0,98 |

Huruf: **Figtree** 400/500/600 untuk seluruh antarmuka termasuk angka, sumbu grafik, dan layar AC
(`tabular-nums lining-nums`); **JetBrains Mono** 500 hanya untuk pelat ID unit, kode pelanggan, dan kode gangguan.

## Keputusan

- Warna aksen hanya di angka jawaban, tiket, dan batang per kota. Latar tetap netral.
- Status selalu ikon + teks (`Kritis`, `Perlu servis`, `Terputus`), tidak hanya warna.
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

- **Putaran 3, huruf**: Plus Jakarta Sans diganti Figtree. Spasi kata Plus Jakarta sempit sehingga teks 13 px
  terbaca menempel ("Diperbaruipukul", "Rp1.250"); Figtree sama hangatnya, x-height lega, spasi kata longgar, dan
  angka tabularnya rapi (diuji render berdampingan). Mono tidak lagi dipakai untuk judul unit, nomor tiket, sumbu,
  layar AC, dan logo slot.
- **Putaran 3, skala & ritme**: satu skala tujuh langkah di `:root`; tak ada ukuran px di selektor lain. Bobot
  hanya 400/500/600; tracking negatif hanya di h1 dan angka jawaban (-0,02em). Satu radius 4 px, garis 1 px.
  Angka KPI duduk di kotak setinggi angka jawaban supaya sejajar antarsel walau keterangannya dua baris.
- **Putaran 3, tata letak detail**: kepala unit naik ke atas adegan; fakta unit jadi kisi label-di-atas-nilai
  (dua kolom di 1920, empat di 1440, dua di HP); tiket memakai blok `.sobek` sehingga lekuk sobekan selalu tepat
  di garis putus, berapa pun tinggi judulnya. Sumbu suhu 20 sampai 36 °C dengan langkah 4 (sebelumnya 4,5).
- **Putaran 3, bahasa**: "hisap" → "isap", "galat" → "kode gangguan", "Offline" → "Terputus", "suhu set" →
  "suhu setelan", "dijadwalkan" (status) → "terjadwal", "Peramban menolak akses papan klip" → "Browser tidak
  mengizinkan penyalinan otomatis", temuan jadi "Dari 5 unit bermasalah, 3 belum punya tiket servis."

## Hasil pemeriksaan

- sloplint putaran 3: 0 FAIL, 1 REFLEX (`.tip` milik `shared/charts.css`), 0 WARN. `node --check app.js` lulus.
- Kontras baru: `--ink-3` pada `--accent-soft` 4,60:1; `--ink-2` pada `--tiket` 7,43:1.
- Render 1920×1080, 1440×900, dan 390 (iframe) `?pratinjau` di Chrome headless: tanpa galat konsol, tanpa geser samping.
