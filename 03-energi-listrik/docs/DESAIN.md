# Desain · Pemantauan Energi Listrik

## Arah (format 5 baris unslop)

Format arah diadaptasi dari *unslop* karya Damir Sokolovsky (https://github.com/heydamir/unslop), lisensi CC BY 4.0.

| Baris | Isi |
|---|---|
| Produk | Dasbor untuk manajer fasilitas yang menjaga beban pabrik di bawah batas daya kontrak PLN |
| Karakter | lugas, hemat, tegas |
| Dunia | meteran kWh, lembar tagihan listrik, kertas laporan bulanan |
| Momen | angka sisa kapasitas raksasa dengan sorotan stabilo, dan grafik beban 24 jam |
| Tanda tangan | garis batas kontrak merah putus-putus yang muncul di setiap grafik beban dan energi |

Pertanyaan layar: *berapa sisa kapasitas sampai batas kontrak hari ini, dan siapa penyebab puncaknya?*
Jawaban berupa angka terbesar di layar; temuan ditulis satu kalimat di bawahnya.

## Tata letak

- Kop tagihan: garis tinta 2 px ditambah garis rambut di bawahnya, plus slot ID pelanggan PLN
  (`[REAL DATA: ID pelanggan]`).
- Baris pertama dibagi 5 : 8. Kiri berisi angka jawaban, temuan, dan rincian. Kanan berisi grafik beban
  24 jam setinggi 440 px, grafik terbesar di layar, tanpa kartu (putaran 2: kartu putih bersudut 12 px dihapus).
- Baris KPI tanpa kartu: satu strip dengan pembatas 1 px.
- Baris ketiga dibagi 7 : 5. Kiri berisi energi per jam (batang), kanan pemakaian per area (daftar
  berperingkat dengan batang tipis). Bentuknya sengaja berbeda supaya tidak ada dua grafik setara.
- Tabel kualitas daya penuh lebar, dibuka baris lubang perforasi seperti sobekan tagihan; sel yang melanggar
  ambang ditulis merah tua tebal di samping chip status.
- Energi hari ini tampil sebagai roda penghitung meteran kWh (sel digit gelap).
- Stabilo dipakai di tiga tempat dengan satu warna: angka sisa kapasitas, kalimat tebal temuan, dan area
  penyumbang terbesar.
- Skala tipe putaran 3: 13 / 15 / 17 / 20 / 26 / 44 / 176 px (token `--fs-1..7`). Isi & sel tabel 17 px, label 15 px, sumbu & chip 13 px, judul bagian 20 px, temuan 26 px, KPI 44 px.
- Satu penanda pratinjau: chip `data-pratinjau` "Pratinjau, data contoh"; status koneksi netral
  "Pembacaan sampai pukul 14.32"; teks data contoh di footer dan sub tabel dihapus.
- Setiap bagian dibuka garis tinta 2 px, bukan kartu, mengikuti gaya editorial laporan.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` | `#f7f4ee` | latar halaman (kertas hangat) |
| `--surface` | `#fdfbf7` | kartu grafik beban, kop |
| `--raised` | `#efe9df` | baris MDP, hover |
| `--ink` / `--rule` | `#1f1b16` | teks utama, garis bagian, garis beban, batang jam puncak |
| `--ink-2` | `#5e554a` | teks sekunder |
| `--ink-3` | `#6b6257` | meta dan sumbu (5,45:1 di atas `--bg`) |
| `--s3` | `#b9ad9c` | batang energi biasa, batang area selain peringkat 1 |
| `--mark` | `#f3d36b` | sorotan stabilo di bawah angka sisa kapasitas (satu-satunya aksen) |
| `--crit` | `#c62828` | garis batas kontrak (tanda tangan) |
| `--wheel-1` / `--wheel-2` / `--wheel-ink` | `#2b2620` / `#100e0b` / `#fdfbf7` | roda penghitung kWh (14,5:1) |
| `--chart-fs` / `--tip-fs` / `--st-fs` | `--fs-1` (13 px) | sumbu, tooltip, chip; `--chart-font` = Archivo |
| `--fs-1..7` | 13 / 15 / 17 / 20 / 26 / 44 / 176 px | satu-satunya ukuran huruf |
| `--sp-1..8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px | jarak |
| `--r` | 2 px | satu radius untuk slot logo, chip, pita, tooltip, roda |

Status memakai pasangan chip latar pucat + teks gelap se-hue, selalu dengan ikon bentuk dari
`shared/charts.js`.

## Huruf

| Peran | Huruf | Alasan |
|---|---|---|
| Antarmuka, isi, tabel | Archivo variabel, lebar 100, bobot 400/500/600 | x-height lega, angka tabular yang jelas; satu berkas variabel menggantikan tiga famili |
| Angka besar, KPI, roda kWh | Archivo variabel, lebar 75 (`font-stretch: 75%`) | sempit dan padat seperti digit meteran, dari famili yang sama sehingga metrik selaras |
| Mono | tidak dipakai (hanya `ui-monospace` untuk perintah di pita galat) | putaran 3: mono di sumbu, ID, dan angka tabel membuat teks menempel dan terasa mentah |

## Keputusan putaran 3

| Keputusan | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| Font | Archivo + Archivo Narrow + DM Mono | Archivo variabel (`wdth` 75..100, `wght` 400..600) | satu famili, lebih sedikit unduhan; angka sumbu & tabel kini sans tabular, bukan mono |
| Skala tipe | 14 / 16 / 18 / 22 / 48 / 208, px ditulis di banyak selektor | 13 / 15 / 17 / 20 / 26 / 44 / 176 lewat `--fs-1..7` saja | satu skala; `grep "font-size: *[0-9]"` di style.css hanya kena `:root` |
| Skala HP (≤ 900 px) | ukuran ditimpa per selektor | token ditimpa: `--fs-4` 18, `--fs-5` 21, `--fs-6` 32, `--fs-7` 112 | ritme sama, ukuran turun bersama |
| Tracking | -0.03em pada angka raksasa | -0.02em hanya pada angka raksasa, sisanya 0 | batas brief |
| Satuan | ukuran raksasa/48 px ikut angka | `.u` 15 px, abu, dipisah `&thinsp;` | angka diperlakukan sebagai tipografi |
| Garis & sudut | 3 px, 2 px, 1 px; radius 2 dan 4 | garis tinta 2 px + rambut 1 px; satu radius 2 px (chip & tooltip ikut) | konsistensi komponen |
| Jarak | campur 20/28/36/40 | token `--sp-1..8` (4..64), antarbagian 64 px | ritme 4/8 |
| Hero kiri | tanpa garis pembuka, judul abu 22 px | dibuka garis tinta seperti grafik di sebelahnya, judul sejajar baseline | tepi atas dua kolom rata |
| Tabel | judul kolom "V R-N", "I R", angka mono | kepala dua tingkat: "Tegangan fasa-netral (V)" dan "Arus (A)" dengan R/S/T | satuan sekali di kepala, angka sans tabular rata kanan |
| Data contoh | puncak 1.587 kW tidak ada di grafik (grafik 1.541), beban sekarang 1.284 vs ujung grafik ±820, total area ≠ energi hari ini | semua angka contoh diturunkan dari satu deret 15 menit: puncak, sisa, energi, per jam, per area (total = energi), daya & arus panel (I = P / 3·V·PF) | angka yang saling cocok; grafik digeser supaya beban rendah malam, tinggi siang |
| Bahasa | "dibaca pukul", "00.00 sampai", "30 %", "Terhubung · diperbarui", "Mode data contoh: API tidak terhubung", "Data ditarik lewat REST dengan ETag" | "Dibaca pukul", "Pukul 00.00 sampai 14.32", "30%", "Terhubung, diperbarui pukul 14.32", "Server tidak terhubung, layar menampilkan data contoh", "Data diperbarui otomatis tiap 60 detik" | sentence case, EYD (persen rapat), tanpa titik tengah sebagai pemisah, tanpa istilah API di depan pengguna |

## Keputusan yang melanggar default (waive)

- Angka sisa kapasitas 176 px (112 px di HP) melebihi batas ukuran KPI design-guide (≤ 48 px). Alasannya, brief proyek
  meminta satu angka jawaban editorial yang terbaca dari seberang ruangan. Hanya satu angka yang boleh
  sebesar ini.

## State

| Wilayah | Memuat | Kosong / galat | Penuh |
|---|---|---|---|
| Seluruh dasbor | `aria-busy="true"`, teks "Memuat ..." | pita kuning "Server tidak terhubung, layar menampilkan data contoh" + sebab + perintah menjalankan stack | data API |
| Pembaruan berkala | indikator titik di kop | gagal setelah pernah terhubung: titik merah + "menampilkan data terakhir" | "Terhubung, diperbarui pukul 14.32" atau "Terhubung, belum ada data baru" (304) |
| Biaya | - | `[REAL DATA: tarif]` sampai tarif diisi | - |

## Pemeriksaan

- `sloplint web`: 0 FAIL (2 REFLEX: padding `.tip` di shared/charts.css, ditimpa lokal; tak ada kontrol yang butuh `:active`).
- Kontras: `--ink-3` di `--bg` 5,45:1, di `--raised` (hover) 4,95:1; `--ink-2` 6,66:1; roda 14,5:1; chip peringatan 6,85:1; chip normal 6,86:1; teks sel melanggar ambang 8,03:1.
- Putaran 3 dirender di 1920×1080, 1440×900, dan 390×844 (`?pratinjau`); satu kolom di bawah 1280 px, KPI 2 kolom di bawah 900 px.
