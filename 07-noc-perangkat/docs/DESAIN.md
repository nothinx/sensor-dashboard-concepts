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
| Huruf UI | Inter Tight 400/500/600 |
| Huruf data (ID, angka, waktu) | JetBrains Mono 400/500, tabular |
| Rel rak / lubang / sekrup | `#1c1c1f` / `#0a0a0b` / `#34343a` |
| Panel log terminal / garis / baris | `#0c0d0e` / `#222225` / `#1c1c1f` |
| Skala tipe (1920) | isi 15, label 13, h2 18, temuan 18, h1 34, angka 32, angka jawaban 48; `--chart-fs` 13 |
| Radius | kontrol dan pelat 4 |
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

## Hasil pemeriksaan

- sloplint putaran 2: 0 FAIL, 1 REFLEX (`.tip` milik `shared/charts.css`), 0 WARN. Teks redup pada panel log
  5,74:1.
- Render 1920×1080 dan 390×844 `?pratinjau` di Chrome headless: tanpa galat konsol, tanpa geser samping.
