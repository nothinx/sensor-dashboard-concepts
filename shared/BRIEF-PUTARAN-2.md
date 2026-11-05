# Brief putaran 2: kritik desainer utama

Ditulis dari sudut pandang desainer utama yang meninjau 15 konsep sebelum dipresentasikan ke klien. Semua konsep
sudah lulus sloplint (0 FAIL) dan memakai arah lima baris unslop di `docs/DESAIN.md`. Masalahnya bukan aturan
yang dilanggar. Masalahnya adalah **lima baris itu belum sepenuhnya terlihat di layar**: banyak konsep hanya
menampilkan "dunia" lewat satu widget tanda tangan, sementara sisa halamannya kembali ke kartu putih bersudut
bulat yang bisa tertukar antarproyek.

## Ukuran keberhasilan

Tutup nama proyek di header. Desainer lain harus bisa menebak **produk, pengguna, dan dunianya** dari
tangkapan layar 1920×1080 dalam lima detik, dan tidak ada dua konsep yang terasa berasal dari templat yang sama.

## Temuan lintas proyek

1. **Rumpun "SaaS putih".** Proyek 05, 06, 09, 10, 11, 12, dan 15 (juga 02) memakai resep yang sama: latar abu
   sangat muda, kartu putih, garis tepi tipis, sudut 8 sampai 12 px, sans 12 sampai 14 px. Di tiap proyek
   ini, minimal dua dari tiga hal berikut harus berbeda tegas dari tetangganya: struktur permukaan (kartu,
   lembar, panel menyatu, garis kisi), bentuk tepi dan sudut, serta skala tipe.
2. **Skala tipe terlalu kecil untuk 1920×1080.** Label 11 px dan isi 12 sampai 13 px membuat layar terasa kosong
   sekaligus sulit dibaca. Patokan: isi ≥ 14 px, label ≥ 12 px, angka utama sesuai jarak baca di DESAIN.md.
   Proyek yang menyebut jarak baca (01: 3 sampai 5 m, 06: 2 m) wajib membuktikannya dengan ukuran angka.
3. **Kanvas tidak dipakai.** Proyek 05 dan 15 mengunci isi di kolom tengah dan menyisakan ruang mati.
   Grafik dan bagian "Momen" harus mendapat porsi terbesar layar, bukan sekadar kartu yang sama ukurannya
   dengan yang lain.
4. **Penanda data contoh berlapis tiga.** Chip "Data contoh", teks "Data contoh bawaan" atau "Tidak terhubung",
   dan label pratinjau melayang tampil bersamaan, dan label melayang menutupi isi tabel. Label melayang sudah
   dihapus dari `shared/charts.js`. Tiap situs kini wajib punya **tepat satu** penanda di header, yaitu elemen
   dengan atribut `data-pratinjau`. Saat `PRATINJAU` (global dari `shared/charts.js`) bernilai benar, penanda
   itu berbunyi "Pratinjau, data contoh", dan teks status koneksi tidak boleh menampilkan "Tidak terhubung"
   berwarna galat. Di luar mode pratinjau, perilaku koneksi lama tetap berlaku.
5. **"Dunia" hanya muncul di satu titik.** Contoh: kertas grafik di 02 tidak tampak di latar grafik, lantai
   epoksi berkisi di 05 tidak tampak di denah, label nomor seri di 15 hanya berupa teks mono biasa. Bawa
   material dunia ke dua atau tiga permukaan lagi: latar grafik, bentuk panel, tipografi angka, garis pemisah.
   Lakukan dengan CSS/SVG buatan sendiri, tanpa gambar dari internet.

## Catatan per proyek

| No | Yang sudah kuat | Yang harus naik kelas |
|---|---|---|
| 01 | ISA-101, pita 24 jam, jam shift | Angka KPI dan judul belum terbaca dari 3 sampai 5 m; perbesar dan beri jarak napas, tetap tanpa scroll |
| 02 | Pelat zona, kurva 10 zona | Latar grafik kertas milimeter; pelat nama mesin di header; tabel zona terpotong di 1080 |
| 03 | Stabilo, kertas krem, angka raksasa | Cek ritme bagian bawah dan tabel kualitas daya; jaga agar tidak berubah jadi kartu |
| 04 | Spektrum teal, cap ISO | Daftar mesin di sidebar terlalu kecil; cap ISO bisa lebih berani di judul |
| 05 | Ide denah lantai | Denah harus menjadi gambar arsitektur sungguhan (dinding tebal, pintu, airlock, kisi epoksi), mengisi lebar layar; titik sensor berlabel; blok uji gelang ESD lebih menonjol |
| 06 | Hitung mundur pintu, pita termometer | Angka suhu wajib terbaca dari 2 m (≥ 64 px); kartu ruang dingin seperti label rak/pintu ruang pendingin; pita termometer lebih tebal |
| 07 | Topologi, umur data berjalan | Baris kotak sensor menyisakan ruang kosong kanan; manfaatkan lebar atau rapatkan |
| 08 | Lembar dokumen terkendali, cap biru | Pertahankan; rapikan panel kanan agar terasa map arsip, bukan form SaaS |
| 09 | Unit AC CSS, tiket sobek | Unit AC dan panel detail terlalu kecil; bawa nuansa rumah pelanggan ke lebih banyak permukaan |
| 10 | Judul serif, titik sampling | Alur S1 sampai S4 sebagai alur proses berpipa, bukan empat kartu sejajar; label botol sampel |
| 11 | Kartu absen, mobile-first | Di desktop, sajikan sebagai bingkai HP plus panel konteks, bukan dua kolom sempit di tengah |
| 12 | Papan SLA, badge mitra | Papan dispatcher: kolom per status atau papan jadwal yang lebih fisik; hitung mundur lebih dominan |
| 13 | Pita kuning-hitam, tangki | "Peta skematik barat ke timur" belum terasa peta: letakkan cabang menurut bujur sebenarnya pada sumbu barat-timur; tangki lebih besar |
| 14 | Stempel LULUS/GAGAL, kurva vakum | Merah terlalu banyak; merah hanya untuk gagal. Papan lini lebih tegas sebagai dua lajur Lini 1 dan Lini 2 |
| 15 | Garis waktu, stiker QC | Halaman terasa formulir pencarian; jadikan garis waktu unit pahlawan selebar layar dengan label nomor seri bergaya stiker (barcode CSS, perforasi) |

## Batas kerja

- Hanya ubah `NN-*/web/` dan `NN-*/docs/DESAIN.md` proyek yang ditugaskan. Jangan ubah `shared/`, `api/`,
  `simulator/`, `db/`, atau proyek lain.
- Jaga semua wiring data di `app.js`: fungsi fetch, WebSocket, SSE, MQTT, GraphQL, dan SDK cloud tetap bekerja
  saat API hidup. Mode tanpa API tetap memakai `TANPA_API`.
- Arah lima baris unslop di DESAIN.md adalah kontrak. Boleh dipertajam, tidak boleh diganti konsep lain.
  Catat keputusan baru di tabel Keputusan DESAIN.md dan perbarui token bila berubah.
- Floor design-guide tetap berlaku: kontras diukur (`python ~/.agents/skills/design-guide/scripts/contrast-check.py`),
  status ikon dan teks, fokus terlihat, `prefers-reduced-motion`, tanpa em dash, tanpa emoji, tanpa label kapital
  ber-tracking, data yang tidak pasti ditandai `[REAL DATA: ...]`. Teks Indonesia EYD V.
- Tanpa pustaka atau font baru dari CDN selain Google Fonts yang sudah dipakai proyek itu (boleh ganti font
  Google lain bila beralasan; IBM Plex tetap dilarang).
- Gerbang selesai: sloplint 0 FAIL, render 1920×1080 dengan `?pratinjau` diperiksa dengan mata, tanpa galat
  konsol, tanpa scroll horizontal di 390 px.
