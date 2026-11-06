# Desain dasbor

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) karya Damir Sokolovsky, lisensi CC BY 4.0.

- **Produk.** Kepala lini memastikan setiap kulkas lulus uji akhir sebelum dikemas, dan tahu lini mana yang
  sedang bermasalah.
- **Karakter.** Tegas, cepat, adil.
- **Dunia.** Bilik uji di ujung lini: gauge tekanan, label lulus/gagal yang ditempel di unit, papan lini.
- **Momen.** Kurva penurunan tekanan vakum unit terakhir pada skala log, dengan jendela target (≤ 100 Pa dalam
  240 detik) sebagai kotak hijau putus-putus.
- **Tanda tangan.** Stempel bulat LULUS/GAGAL per unit, seperti cap tinta di label unit; stempel besar miring
  pada unit yang sedang dilihat.

## Pertanyaan layar

"Apakah ada lini yang sedang meloloskan terlalu sedikit unit, dan kenapa?" Judul menjawabnya langsung
(mis. "Lini 2 di bawah target: FPY 70% pada 20 unit terakhir"), temuan di bawahnya menyebut penyebab terbanyak.

## Tata letak

Papan dua lajur: **Lini 1** dan **Lini 2** bertumpuk di kiri, masing-masing berupa pelat nama (nama lini, model,
FPY 20 unit terakhir 34 px, chip target) dan sabuk konveyor berisi 10 stempel terakhir yang mengalir ke kanan menuju
blok hitam "bilik uji". Panel unit terakhir (momen, kurva vakum) di kanan setinggi kedua lajur. Baris bawah: FPY per
jam, alasan gagal, unit menunggu uji ulang dan alarm. Pada lebar ≤ 1700 px pelat nama naik ke atas sabuk; < 1400 px panel unit naik ke atas; < 1100 px satu
kolom dan sabuk menjadi dua baris lima stempel.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` | `#f2f2f0` / `#fdfdfb` | latar netral abu hangat, panel putih yang sedikit hangat |
| `--rule` | `#171717` | garis tinta 3 px di atas tiap panel (gaya label industri, tanpa sudut membulat) |
| `--line` | `#e2e2de` | satu-satunya garis tipis 1 px: pembagi KPI, rinci, ukur, daftar |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#4a4a47` / `#686864` | teks primer, sekunder, redup (`--ink-3` 5,6:1 di putih, 5,0:1 di latar) |
| `--lulus` / `--gagal` | `#17713a` / `#c0262d` | tinta stempel (6,1:1 dan 5,9:1 di putih), juga angka buruk |
| `--s1` / `--s2` | `#2a78d6` / `#6d4bc4` | seri Lini 1 / Lini 2 dan kurva vakum |
| `--fs-1` … `--fs-6` | 13 / 15 / 17 / 20 / 26 / 34 px | satu-satunya ukuran huruf; ≤ 1100 px: `--fs-5` 22, `--fs-6` 28 |
| `--sp-1` … `--sp-7` | 4 / 8 / 12 / 16 / 24 / 32 / 48 px | semua jarak; padding panel `--pad` 24 (16 di HP), tepi halaman `--tepi` 32 (16) |
| `--chart-font` / `--chart-fs` / `--tip-fs` / `--st-fs` | sans proyek / 13 px | teks grafik, tooltip, chip status |
| status chip | palet status bersama | alarm kritis/peringatan, FPY di bawah target; selalu ikon + teks |

Peran skala tipe: 13 label, keterangan, chip, sumbu · 15 isi dan daftar, juga satuan angka besar · 17 judul panel,
temuan, nama produk · 20 nama lini, nomor unit, angka rinci · 26 angka KPI dan nilai ukur · 34 judul layar dan FPY
lajur. Isi line-height 1.5, judul 1.15 sampai 1.2, angka besar 1.0. Tracking negatif hanya di judul 34 px (-0.015em).

Huruf: **Hanken Grotesk** 400/500/600, satu keluarga untuk semua teks dan angka, `tabular-nums lining-nums` di
`body`. Satuan di samping angka besar memakai `.u` (15 px, 400, `--ink-3`). Satu tombol primer hitam
("Lihat unit menunggu uji ulang").

## Keputusan

- Warna hanya di stempel, angka buruk, dan grafik; kerangka tetap netral.
- Kurva vakum memakai skala log karena tekanan turun tiga dekade (100 kPa ke 100 Pa); skala linear membuat
  bagian penting (dekat target) rata dengan sumbu.
- Status selalu teks + bentuk: stempel memuat kata LULUS/GAGAL, chip alarm memakai ikon.
- Stempel adalah tombol (fokus terlihat, `aria-pressed`, label lengkap untuk pembaca layar).
- Data contoh bawaan memakai bentuk JSON yang sama dengan `/api/ringkasan`, jadi pratinjau tanpa backend
  menampilkan semua bagian.
- Putaran 2: **merah hanya untuk gagal** (stempel GAGAL, nilai ukur yang gagal, kurva terlambat, alarm gagal ulang).
  FPY di bawah target tampil hitam dengan chip peringatan kuning, garis target grafik abu, seri Lini 2 ungu, dan
  rel atas lajur yang di bawah target berwarna `--warn`.
- Putaran 2: lajur sebagai sabuk konveyor (rel tinta 3 px, rol tiap 24 px, bilik uji di ujung) supaya papan lini
  terbaca sebagai dua jalur produksi. Stempel kecil dimiringkan -4° sampai 4° menurut nomor unit, seperti cap tangan.
- Putaran 2: skala tipe 1920: judul 34 px, temuan 17 px, teks stempel 14/12 px, teks grafik 13 px (diganti putaran 3, lihat Token).
- Putaran 2: tepat satu penanda `data-pratinjau` di header; di mode pratinjau status koneksi disembunyikan.
- Putaran 3: **Barlow + Fira Code diganti Hanken Grotesk saja.** Fira Code membuat persen, durasi, satuan, dan
  label sumbu tampil lebar dan kaku ("1,54 g/thn" sama besar dengan angkanya). Hanken Grotesk punya x-height lega,
  angka tabular yang terbukti di render, dan tetap lugas seperti label industri. Atkinson Hyperlegible Next sempat
  dicoba, tetapi nol bergaris miringnya tak bisa dimatikan dan membuat KPI terlihat seperti terminal. Nomor seri unit
  memakai sans yang sama; seri tidak memuat huruf O atau l, jadi tak perlu mono.
- Putaran 3: satu skala tipe enam langkah di `:root`; tidak ada `font-size` angka lepas di luar `:root`. Satuan
  diredam dan dipisah sedikit dari angka; persen serangkai dengan angka sesuai EYD ("60%").
- Putaran 3: istilah diseragamkan: "uji pertama" dan "uji ulang" (bukan "percobaan"), "detik" dan "g/tahun" (bukan
  "dtk", "g/thn"), "FPY per jam" (bukan "First pass yield"), "Penyebab gagal terbanyak", "Evaporator kurang dingin",
  minus tipografis pada suhu. Jargon pengembang ("change feed", "long polling", "API") keluar dari teks pengguna;
  banner koneksi tetap menyebut perintah docker untuk teknisi.
- Putaran 3: stempel uji ulang ditandai lingkar putus-putus (dijelaskan di judul sabuk), bukan "·2" di nomor.
  Di ≤ 1700 px pelat nama naik ke atas sabuk supaya 10 stempel tetap ≥ 60 px; di 1401 sampai 1700 px nilai ukur
  2 × 2. Di HP sabuk menembus tepi panel supaya kata LULUS/GAGAL tetap muat di dalam cincin.
- Putaran 3: rinci lajur tidak lagi mengulang FPY 24 jam yang sudah ada di pita KPI (satu angka satu tempat).
  Label kurva vakum dipindah ke dalam kotak target supaya tidak menabrak kurva; sumbu waktu hanya angka, satuan
  "detik" di ujung.
- Putaran 3: perbaikan bug: kelas `.bawah` dipakai dua kali (lajur di bawah target dan baris bawah), sehingga
  Lini 2 ikut mendapat margin baris bawah. Baris bawah kini `.baris-bawah`.
