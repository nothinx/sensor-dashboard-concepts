# Desain · NOC Perangkat & Gateway

Arah desain ditulis dengan format lima baris dari **unslop** karya Damir Sokolovsky
(<https://github.com/heydamir/unslop>, CC BY 4.0), dipadukan dengan panduan design-guide internal.

## Arah

| Baris | Isi |
|---|---|
| Produk | Teknisi IT/OT menemukan sensor yang berhenti mengirim data dan tahu apa yang diperbaiki lebih dulu. |
| Karakter | cepat, apa adanya, teknis |
| Dunia | rak jaringan, lampu link, terminal shift malam |
| Momen | diagram topologi kolektor → gateway → 418 sensor, satu kotak per sensor |
| Tanda tangan | penanda "terakhir mengirim data": titik yang berdetak tiap data masuk dan umur data yang berjalan tiap detik |

Pertanyaan layar: *sensor mana yang hilang, dan apa yang diperbaiki lebih dulu?* Temuan di bawah judul
menyebut gateway yang menjadi akar masalah, dan tombol primer langsung menampilkan sensor di belakangnya.

## Token

| Peran | Nilai |
|---|---|
| Sidebar / latar / kartu / naik | `#0f0f10` / `#141415` / `#19191b` / `#232325` |
| Garis rambut | `#29292c` |
| Teks primer / sekunder / redup | `#ededed` / `#a1a1a6` / `#8b8b91` |
| Aksen (seri grafik, fokus, tautan) | `#8ab4ff` |
| Status baik / peringatan / kritis | `#4cc38a` / `#e2a336` / `#e5484d` |
| Huruf UI dan angka | Hanken Grotesk 400/500/600, `tabular-nums lining-nums` di `body` |
| Huruf ID dan perintah | JetBrains Mono 400/500, hanya ID sensor/gateway, nama aturan alert, perintah terminal |
| Rel rak / lubang / sekrup | `#1c1c1f` / `#0a0a0b` / `#34343a` |
| Panel log terminal / garis / baris | `#0c0d0e` / `#222225` / `#1c1c1f` |
| Skala tipe (1920) | `--fs-xs` 13 label/th/chip/sumbu, `--fs-sm` 15 isi, `--fs-md` 17 judul panel, `--fs-lg` 20 temuan, `--fs-xl` 28 angka KPI, `--fs-2xl` 40 judul layar dan angka jawaban. HP: 13/15/17/17/24/32. `--chart-font` sans, `--chart-fs`/`--tip-fs`/`--st-fs` 13 |
| Jarak | `--sp-1..7` = 4/8/12/16/24/32/48; tepi dalam pelat `--pad` 28 (HP 16) |
| Radius / garis | `--r` 4 kontrol dan pelat, `--r-sm` 2 kotak port dan batang; satu garis 1 px `--line` |
| Gerak | satu kurva `cubic-bezier(0.22, 1, 0.36, 1)`; detak 600 ms sekali per data masuk |

Kontras yang diukur (`contrast-check.py`): teks redup pada kartu 5,18:1, aksen pada latar 8,81:1,
semua chip status di atas 8:1.

## Keputusan

- **Gelap graphite netral**: layar ini dibuka di ruang NOC dan shift malam. Warna dunia hanya muncul di
  aksen dan status, latar tetap abu-abu.
- **Warna hanya untuk masalah**: kotak sensor normal berwarna abu-abu; merah = tidak mengirim data (terisi),
  kuning = baterai rendah (garis tepi). Bentuk berbeda supaya tidak bergantung pada warna saja; setiap kotak
  juga punya keterangan saat kursor diarahkan.
- **Satu gangguan, satu baris**: 17 sensor di belakang GW-GD diringkas menjadi satu baris grup yang bisa
  dibuka, karena teknisi memperbaiki gateway, bukan 17 sensor.
- **Detak bukan hiasan**: titik di sidebar berdenyut sekali setiap Prometheus menjawab. Bila koneksi gagal,
  titik berubah menjadi lingkaran kosong. `prefers-reduced-motion` mematikan denyut.
- **State**: memuat (teks di setiap panel), kosong (mis. "Semua sensor mengirim data"), galat (pita dengan sebab
  dan perintah pemeriksaan), dan mode data contoh saat dibuka sebagai file.
- **Putaran 2, dunia rak di lebih banyak permukaan**: rel rak 19 inci berlubang (satu lubang per 1U) di kedua
  tepi area kerja; setiap panel menjadi pelat depan bersekrup bersudut 4 px; gateway punya lampu link (bulat
  terisi = menyala, cincin merah = mati); alert aktif tampil sebagai tail log terminal dengan jam di depan;
  grafik riwayat berlatar kisi titik layar.
- **Putaran 2, topologi memakai lebar penuh**: ukuran port dihitung dari lebar sehingga gateway terbesar paling
  banyak tiga baris; kolom kanan menampilkan umur data per gateway yang berjalan tiap detik, sehingga tanda
  tangan juga hadir di momen. Di bawah 900 px kolektor dan kolom umur data disembunyikan.
- **Putaran 2, satu penanda pratinjau**: elemen `data-pratinjau` di samping judul berbunyi "Pratinjau, data
  contoh". Di pratinjau, detak sinkron disimulasikan tiap 15 detik dan tidak ada teks "Tidak tersambung".

- **Putaran 3, huruf ganti ke Hanken Grotesk**: Inter Tight terlalu rapat untuk teks 13 sampai 15 px di layar
  gelap, sehingga kata terasa menempel. Hanken Grotesk punya spasi terbuka, x-height lega, dan angka tabular asli
  (diukur: lebar "1111" = "0000"; Mona Sans dan Atkinson Hyperlegible Next di Google Fonts tidak). Geist sudah
  dipakai proyek lain.
- **Putaran 3, mono dipangkas**: durasi, cap waktu, angka KPI, judul panel log, dan keterangan topologi kini sans
  tabular. Mono hanya untuk ID (sensor, gateway, aturan alert) dan perintah `curl`, seperti label kabel di rak.
  Satuan (`%`, "dari 6", "/ 64") lebih kecil atau redup, dipisah spasi tipis.
- **Putaran 3, satu skala tipe**: enam token di `:root`, tidak ada ukuran px lepas di selektor. Tracking negatif
  hanya di h1 40 px (-0.02em). Judul panel 17/600, label 13/400, isi 15/400; bobot maksimal 600.
- **Putaran 3, tata letak**: di 1920 sensor bermasalah (8 kolom) di samping gateway (4), grafik (8) di samping log
  alert (4). Di 1281 sampai 1600 tabel sensor dan grafik memakai lebar penuh, gateway dan alert berdampingan
  (`grid-auto-flow: dense`), sehingga tidak ada tabel terpotong. Tabel di HP bergeser di dalam pelatnya.
- **Putaran 3, grafik**: hanya penurunan yang belum pulih yang diberi anotasi ("Turun 17, belum pulih"); lonjakan
  sesaat 71 sensor tidak lagi bertumpuk labelnya. Tinggi grafik mengikuti lebar kolom.
- **Putaran 3, bahasa**: satu istilah "tidak mengirim data" (bukan "offline"), satuan ditulis penuh ("8 jam 20 menit
  lalu", bukan "8 jam 20 mnt"), "baru saja" di bawah 2 detik, "galat" menjadi "error" untuk CRC, kalimat temuan
  diawali "Sebanyak" (EYD: kalimat tidak diawali angka), tanpa pemisah "·".

## Hasil pemeriksaan

- sloplint putaran 3: 0 FAIL, 0 REFLEX, 0 WARN. Teks redup pada kartu 5,18:1, pada baris grup 4,96:1, pada
  hover baris 4,63:1, pada panel log 5,74:1.
- Render 1920×1080, 1440×900, dan 390 px `?pratinjau` di Chrome headless. Chrome headless di Windows tidak bisa
  lebih sempit dari 500 px, jadi 390 px dirender lewat iframe 390 px; tanpa geser samping halaman.
