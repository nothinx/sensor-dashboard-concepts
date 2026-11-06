# Desain · Pusat Pemantauan Pabrik

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk**: layar dinding ruang kontrol agar supervisor shift tahu dalam satu lirikan area mana yang
  bermasalah dan sejak kapan.
- **Karakter**: waspada, padat, tenang.
- **Dunia**: ruang kontrol shift malam, panel HMI berstandar ISA-101.
- **Momen**: kisi pita status 24 jam untuk 10 area; satu-satunya bagian yang boleh berwarna.
- **Tanda tangan**: jam shift (shift berjalan, jam selesai, sisa waktu) dan titik status hidup koneksi.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Normal = abu-abu, bukan hijau | Prinsip ISA-101: warna hanya untuk keadaan tidak normal, supaya alarm langsung terlihat |
| Tanpa scroll di 1920×1080 | Layar dinding tidak disentuh; semua jawaban harus tampak sekaligus |
| Skala tipe 18 / 22 / 28 / 36 / 48 / 64 / 96 px, token `--fs-1` sampai `--fs-7` (putaran 3) | Tujuh langkah, hanya lewat token (tak ada px di selektor). Label & chip 18, isi 22, judul panel/nama area/nama alarm 28, jam & nilai alarm 36, judul temuan & nilai KPI 48, sisa shift 64, jumlah alarm 96. HP: 15 / 17 / 21 / 26 / 32 / 44 / 64 |
| Huruf Archivo variabel menggantikan Barlow Condensed + JetBrains Mono (putaran 3) | Barlow Condensed sempit dan sesak di 18 sampai 22 px; mono membuat angka dan durasi melebar. Archivo: x-height lega, angka tabular & lining yang baik, sumbu lebar dalam satu keluarga (lebar 82 untuk judul & nama area, 100 untuk isi & angka). Satu berkas, bobot 400 sampai 600 |
| Mono dihapus | Angka memakai `tabular-nums lining-nums` di sans; satuan 22 px abu dipisah spasi tipis; tag JI-100/TI-200 dan A01 juga sans |
| Jumlah alarm menyatu dengan judul temuan (putaran 3) | Satu angka satu tempat: "3 alarm aktif di 3 area" dengan angka 96 px; kartu KPI "Alarm aktif" dihapus, KPI tinggal 4 |
| Sumbu pita berlabel jam pergantian shift (putaran 3) | Label 22.00, 06.00, 14.00 tepat di atas garis tegak; legenda memuat "Pergantian shift" sehingga keterangan panjang di bilah judul tak perlu |
| Satu sistem komponen | Radius 2 px, garis 1 px, padding panel 24 px, tombol 48 px, jarak `--sp-*` kelipatan 4; tracking negatif hanya di angka 96 px |
| Istilah (putaran 3) | "offline" jadi "sensor terputus", "Akui alarm" jadi "Konfirmasi", "mnt" jadi "menit", "Cold storage B" jadi "Ruang pendingin B", "Sensor online" jadi "Sensor terhubung", "maks/min" jadi "Batas atas/bawah" |
| Alarm terurut kritis lalu terlama | Yang paling berbahaya dan paling lama diabaikan ada di atas |
| Pita arsir untuk offline | Membedakan "tidak ada data" dari "normal" tanpa menambah warna |
| Jam shift pindah ke kaki kolom alarm (putaran 2) | Tanda tangan jadi blok sendiri: nama shift, bilah waktu berjalan, sisa shift 64 px; jam di header 36 px |
| Pergantian shift digambar di pita 24 jam | Garis tegak pukul 06.00, 14.00, 22.00 menyambung 10 baris; supervisor melihat alarm terjadi di shift siapa |
| Panel bergaya faceplate HMI | Sudut 2 px, bilah judul bergaris bawah, tag instrumen ISA-5.1 (JI-100 daya, TI-200 suhu), nomor area A01 sampai A10. Tag contoh, `[REAL DATA: tag dari P&ID klien]` |
| Penanda pratinjau tunggal | Chip `data-pratinjau` di header berbunyi "Pratinjau, data contoh"; status koneksi netral "Data per pukul 14.32", jam berjalan dari waktu data contoh; footer dihapus |
| Satu pertanyaan per layar | "Area mana yang perlu ditangani sekarang?" dijawab judul, angka alarm, dan pita |

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#141415` / `#19191b` / `#202022` | Latar, panel, kontrol & kotak shift (graphite netral) |
| `--ink` / `--ink-2` / `--ink-3` | `#ededed` / `#b4b4b9` / `#8e8e94` | Teks utama, sekunder, redup (`--ink-3` 5,0:1 di `--raised`, lebih tinggi di latar lain) |
| `--cell` | `#3a3a3e` | Sel pita normal |
| `--warn` | `#e0a526` | Peringatan (amber) |
| `--fs-1` … `--fs-7` | 18 / 22 / 28 / 36 / 48 / 64 / 96 px | Skala tipe layar dinding (satu-satunya sumber ukuran huruf) |
| `--chart-font`, `--chart-fs`, `--tip-fs`, `--st-fs` | Archivo, `--fs-1` | Teks grafik, tooltip, chip status |
| `--sp-1` … `--sp-7` | 4 / 8 / 12 / 16 / 24 / 32 / 48 px | Jarak; tepi halaman 32 px, padding panel 24 px |
| `--radius` / garis / `--ctl` | 2 px / 1 px / 48 px | Sudut, garis, tinggi tombol |
| `--crit` | `#e5484d` | Kritis |
| Huruf | Archivo variabel, lebar 82 sampai 100, bobot 400 sampai 600 | Judul & nama area lebar 82; isi & angka tabular lebar 100 |

Status selalu ikon + teks (`st()` di `shared/charts.js`), tidak hanya warna. Animasi hanya titik koneksi
hidup, dimatikan oleh `prefers-reduced-motion`.

## Keadaan

| Keadaan | Tampilan |
|---|---|
| Memuat | Judul "Memuat status pabrik", panel `aria-busy` |
| Normal penuh | Judul "Semua area normal", daftar alarm berisi penjelasan kapan alarm akan muncul |
| Koneksi WebSocket putus | Titik berbingkai merah, teks "Terputus, mencoba lagi" |
| API tidak terhubung | Data contoh + pita kuning berisi sebab dan langkah menjalankan stack |
| Pratinjau (`?pratinjau`) | Pita disembunyikan, chip "Pratinjau, data contoh", titik koneksi netral |
