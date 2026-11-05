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

- Kop tagihan: garis tinta 3 px ditambah garis rambut di bawahnya, plus slot ID pelanggan PLN
  (`[REAL DATA: ID pelanggan]`).
- Baris pertama dibagi 5 : 8. Kiri berisi angka jawaban, temuan, dan rincian. Kanan berisi grafik beban
  24 jam setinggi 420 px, grafik terbesar di layar, tanpa kartu (putaran 2: kartu putih bersudut 12 px dihapus).
- Baris KPI tanpa kartu: satu strip dengan pembatas 1 px.
- Baris ketiga dibagi 7 : 5. Kiri berisi energi per jam (batang), kanan pemakaian per area (daftar
  berperingkat dengan batang tipis). Bentuknya sengaja berbeda supaya tidak ada dua grafik setara.
- Tabel kualitas daya penuh lebar, dibuka baris lubang perforasi seperti sobekan tagihan; sel yang melanggar
  ambang ditulis merah tua tebal di samping chip status.
- Energi hari ini tampil sebagai roda penghitung meteran kWh (sel digit gelap).
- Stabilo dipakai di tiga tempat dengan satu warna: angka sisa kapasitas, kalimat tebal temuan, dan area
  penyumbang terbesar.
- Skala tipe putaran 2: 14 / 16 / 18 / 22 / 48 / 208 px. Isi 16 px, label 14 sampai 16 px, KPI 48 px.
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
| `--chart-fs` | 14 px (12 px di HP) | teks sumbu grafik |

Status memakai pasangan chip latar pucat + teks gelap se-hue, selalu dengan ikon bentuk dari
`shared/charts.js`.

## Huruf

| Peran | Huruf | Alasan |
|---|---|---|
| Antarmuka | Archivo 400/500/600 | grotesk tegas dengan angka jelas, cocok untuk karakter lugas |
| Angka besar & KPI | Archivo Narrow 500/600 | sempit dan padat seperti digit meteran, muat besar tanpa memakan lebar |
| Sumbu, tabel angka, meta | DM Mono 400/500 | angka tabular untuk kolom rata kanan |

## Keputusan yang melanggar default (waive)

- Angka sisa kapasitas 208 px melebihi batas ukuran KPI design-guide (≤ 48 px). Alasannya, brief proyek
  meminta satu angka jawaban editorial yang terbaca dari seberang ruangan. Hanya satu angka yang boleh
  sebesar ini.

## State

| Wilayah | Memuat | Kosong / galat | Penuh |
|---|---|---|---|
| Seluruh dasbor | `aria-busy="true"`, teks "Memuat ..." | pita kuning "Mode data contoh: API tidak terhubung" + sebab + perintah menjalankan stack | data API |
| Pembaruan berkala | indikator titik di kop | gagal setelah pernah terhubung: titik merah + "menampilkan data terakhir" | "Terhubung · diperbarui 14.32" atau "tidak ada data baru" (304) |
| Biaya | - | `[REAL DATA: tarif]` sampai tarif diisi | - |

## Pemeriksaan

- `sloplint web/index.html`: 0 FAIL.
- Kontras: `--ink-3` di `--bg` 5,45:1; chip peringatan 6,85:1; chip normal 6,86:1; teks galat sel 8,52:1.
- Dirender di 1920×1080 (mode API dan mode data contoh); tata letak menjadi satu kolom di bawah 1280 px.
