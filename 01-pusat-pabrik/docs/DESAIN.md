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
| Huruf kondens besar (17 sampai 40 px) | Dibaca dari jarak 3 sampai 5 meter; kondens memuat nama area panjang dalam satu baris |
| Alarm terurut kritis lalu terlama | Yang paling berbahaya dan paling lama diabaikan ada di atas |
| Pita arsir untuk offline | Membedakan "tidak ada data" dari "normal" tanpa menambah warna |
| Satu pertanyaan per layar | "Area mana yang perlu ditangani sekarang?" dijawab judul, angka alarm, dan pita |

## Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#141415` / `#19191b` / `#232325` | Latar, panel, kontrol (graphite netral) |
| `--ink` / `--ink-2` / `--ink-3` | `#ededed` / `#b4b4b9` / `#8e8e94` | Teks utama, sekunder, redup (kontras ≥ 5,3:1) |
| `--cell` | `#3a3a3e` | Sel pita normal |
| `--warn` | `#e0a526` | Peringatan (amber) |
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
