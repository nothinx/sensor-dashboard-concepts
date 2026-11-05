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

Papan tiga kolom: **Lini 1 · unit terakhir · Lini 2**. Kedua lini mengapit momen, seperti berdiri di antara dua
lini. Baris bawah: FPY per jam (grafik utama kedua), alasan gagal (batang peringkat), unit menunggu uji ulang
dan alarm (daftar). Pada lebar < 1400 px panel unit naik ke atas selebar layar; < 1100 px semua satu kolom.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` | `#f2f2f0` / `#ffffff` | latar netral abu hangat, panel putih |
| `--rule` | `#171717` | garis tinta 3 px di atas tiap panel (gaya label industri, tanpa sudut membulat) |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#4a4a47` / `#686864` | teks primer, sekunder, redup (5,6:1 di putih) |
| `--lulus` / `--gagal` | `#17713a` / `#c0262d` | tinta stempel (6,1:1 dan 5,9:1 di putih), juga angka buruk |
| `--s1` / `--s2` | `#2a78d6` / `#c4551f` | seri Lini 1 / Lini 2 dan kurva vakum |
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
