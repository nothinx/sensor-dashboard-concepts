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
| Skala tipe 18 / 22 / 26 / 40 / 56 / 96 px (putaran 2) | Dibaca dari 3 sampai 5 m: isi 22 px, nama area 26 px, angka KPI 56 px, jumlah alarm 96 px, judul temuan 52 px |
| Alarm terurut kritis lalu terlama | Yang paling berbahaya dan paling lama diabaikan ada di atas |
| Pita arsir untuk offline | Membedakan "tidak ada data" dari "normal" tanpa menambah warna |
| Jam shift pindah ke kaki kolom alarm (putaran 2) | Tanda tangan jadi blok sendiri: nama shift, bilah waktu berjalan, sisa shift 64 px; jam di header tetap 40 px |
| Pergantian shift digambar di pita 24 jam | Garis tegak pukul 06.00, 14.00, 22.00 menyambung 10 baris; supervisor melihat alarm terjadi di shift siapa |
| Panel bergaya faceplate HMI | Sudut 2 px, bilah judul bergaris bawah, tag instrumen ISA-5.1 (JI-100 daya, TI-200 suhu), nomor area A01 sampai A10. Tag contoh, `[REAL DATA: tag dari P&ID klien]` |
| Penanda pratinjau tunggal | Chip `data-pratinjau` di header berbunyi "Pratinjau, data contoh"; status koneksi netral "Cuplikan pukul 14.32", jam berjalan dari waktu data contoh; footer dihapus |
| Satu pertanyaan per layar | "Area mana yang perlu ditangani sekarang?" dijawab judul, angka alarm, dan pita |

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#141415` / `#19191b` / `#232325` | Latar, panel, kontrol (graphite netral) |
| `--ink` / `--ink-2` / `--ink-3` | `#ededed` / `#b4b4b9` / `#8e8e94` | Teks utama, sekunder, redup (kontras ≥ 5,3:1) |
| `--cell` | `#3a3a3e` | Sel pita normal |
| `--warn` | `#e0a526` | Peringatan (amber) |
| `--fs-s` … `--fs-hero` | 18 / 22 / 26 / 40 / 56 / 96 px | Skala tipe layar dinding |
| `--chart-fs` | 16 px | Teks sumbu grafik |
| `--crit` | `#e5484d` | Kritis |
| Huruf | Barlow Condensed 400/500/600, JetBrains Mono 400/500 | Antarmuka, angka tabular |

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
