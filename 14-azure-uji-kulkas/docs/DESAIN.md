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
(mis. "Lini 2 di bawah target: FPY 20 unit terakhir 70 %"), temuan di bawahnya menyebut penyebab terbanyak.

## Tata letak

Papan dua lajur: **Lini 1** dan **Lini 2** bertumpuk di kiri, masing-masing berupa pelat nama (nama lini, model,
FPY 20 unit terakhir 48 px, chip target) dan sabuk konveyor berisi 10 stempel terakhir yang mengalir ke kanan menuju
blok hitam "bilik uji". Panel unit terakhir (momen, kurva vakum) di kanan setinggi kedua lajur. Baris bawah: FPY per
jam, alasan gagal, unit menunggu uji ulang dan alarm. Pada lebar < 1400 px panel unit naik ke atas; < 1100 px satu
kolom dan sabuk menjadi dua baris lima stempel.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` | `#f2f2f0` / `#ffffff` | latar netral abu hangat, panel putih |
| `--rule` | `#171717` | garis tinta 3 px di atas tiap panel (gaya label industri, tanpa sudut membulat) |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#4a4a47` / `#686864` | teks primer, sekunder, redup (5,6:1 di putih) |
| `--lulus` / `--gagal` | `#17713a` / `#c0262d` | tinta stempel (6,1:1 dan 5,9:1 di putih), juga angka buruk |
| `--s1` / `--s2` | `#2a78d6` / `#6d4bc4` | seri Lini 1 / Lini 2 dan kurva vakum (ungu 6,1:1 di putih, menggantikan jingga-merah) |
| `--chart-fs` | 13 px | teks grafik |
| status chip | palet status bersama | alarm kritis/peringatan, selalu ikon + teks |

Huruf: **Barlow** (lebar normal, bukan Condensed yang dipakai proyek 01) untuk antarmuka, **Fira Code** untuk
angka dan nomor unit, semua angka `tabular-nums`. Satu tombol primer hitam ("Lihat unit menunggu uji ulang").

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
- Putaran 2: skala tipe 1920: judul 34 px, temuan 17 px, teks stempel 14/12 px, teks grafik 13 px.
- Putaran 2: tepat satu penanda `data-pratinjau` di header; di mode pratinjau status koneksi disembunyikan.
