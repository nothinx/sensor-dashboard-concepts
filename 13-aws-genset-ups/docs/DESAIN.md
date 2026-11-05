# Desain: Genset & UPS Cabang

## Arah (format lima baris unslop)

Format arah diambil dari [unslop](https://github.com/heydamir/unslop) karya Damir Sokolovsky, lisensi CC BY 4.0.

- **Produk.** Tim fasilitas pusat memastikan setiap cabang tetap menyala saat PLN padam.
- **Karakter.** Tenang, siaga, terukur.
- **Dunia.** Ruang genset, tangki solar, papan ATS (saklar pindah otomatis) dengan pita peringatan.
- **Momen.** Tangki solar per cabang di peta skematik barat ke timur: tiap ubin berpusat tepat di bujur kotanya pada
  sumbu selebar layar. Isinya abu-abu bila aman, kuning bila waspada, merah bila kritis.
- **Tanda tangan.** Pita bergaris kuning-hitam di atas ubin dengan teks "PLN padam sejak 12.09". Hanya muncul di
  cabang yang sedang padam.

## Pertanyaan layar

"Cabang mana yang berisiko mati listrik?" Temuan di bawah judul selalu menyebut satu cabang paling gawat: cabang
tanpa listrik cadangan (PLN padam dan genset mati) didahulukan, lalu cabang kritis lain, lalu waspada.

## Tata letak

Tanpa sidebar, berbeda dari proyek 01, 04, dan 07 yang juga gelap. Urutan di 1920×1080 tanpa scroll: pita judul
(judul, temuan, satu tombol di kiri; empat angka ringkasan di kanan), sumbu cabang selebar layar, lalu pita detail
cabang terpilih (papan ATS, enam angka, tren 24 jam). Tabel kejadian PLN padam di bawah lipatan. Di bawah 900 px
sumbu menjadi daftar dua kolom yang tetap urut barat ke timur, dan tiap ubin menyebut bujurnya.

## Keputusan

| Keputusan | Alasan |
| --- | --- |
| Ubin diletakkan menurut bujur kota (98,7° Medan sampai 119,4° Makassar) pada sumbu 97,4° sampai 120,6°, dengan meridian tiap 2° dan tiang dari ubin ke titik bujurnya | Kritik putaran 2: peta harus terasa peta. Bujur adalah fakta umum; garis pantai tidak digambar |
| Ubin yang bujurnya bertumpuk (Jakarta, Bekasi, Bandung) naik ke lajur di atasnya, dihitung otomatis | Tidak ada posisi yang dikarang; data API dengan cabang baru tetap tertata |
| Tangki 44×68 px dengan garis ukur 25/50/75 seperti kaca duga | Tangki lebih besar dan terbaca sebagai alat ukur, bukan ikon |
| Pita PLN padam setinggi 20 px, teksnya di pelat hitam di atas garis kuning-hitam, tepi ubin kuning | Tanda tangan lebih tegas tanpa menambah warna |
| Detail cabang memuat diagram satu garis papan ATS (PLN, genset, pisau ATS, UPS, beban) | Dunia papan ATS hadir di permukaan kedua; posisi pisau langsung menjawab "beban ditanggung siapa" |
| Panel siku 2 px dengan garis atas lebih terang, bukan kartu membulat 12 px | Terasa pelat panel listrik |
| Tepat satu penanda `data-pratinjau` di header; di mode pratinjau status koneksi disembunyikan | Brief putaran 2, temuan 4 |
| Skala tipe 1920: isi 15 px, label 13 sampai 14 px, judul 34 px, angka kritis 40 px, angka lain 30 px, teks grafik 13 px (`--chart-fs`) | Brief putaran 2, temuan 2 |

## Token

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--bg` / `--deep` / `--surface` / `--raised` | #141415 / #0f0f10 / #19191b / #232325 | ramp graphite unslop |
| `--ink` / `--ink-2` / `--ink-3` | #ededed / #a8a8ad / #8c8c92 | teks utama, kedua, redup |
| `--s1` | #5fb3f3 | seri solar |
| `--s2` | #3fc1b0 | seri baterai UPS, batang baterai |
| `--warn` / `--crit` / `--good` | #f5b83d / #f06a6a / #4cc38a | status saja, selalu dengan ikon + teks |
| `--line-3` | rgba(237,237,237,0.28) | garis atas panel, sumbu, tepi tangki |
| `--lajur-h` / `--sumbu-h` | 164 px / 36 px | tinggi lajur ubin dan pita sumbu |
| `--chart-fs` | 13 px | teks grafik |
| Huruf antarmuka | Sora 400/500/600 | geometris, tenang |
| Huruf angka | Martian Mono 400/500 | angka tabular, cap waktu |

Tombol utama berwarna off-white dengan teks gelap (anjuran unslop untuk tema gelap). Gerak hanya perubahan warna
150 ms dan tekan 0,98, dengan fallback `prefers-reduced-motion`.

## Kontras (diukur)

| Pasangan | Rasio |
| --- | --- |
| `--ink-3` #8c8c92 di `--surface` #19191b | 5,25 : 1 |
| `--ink-2` #a8a8ad di `--raised` #232325 | 6,63 : 1 |
| `--warn-ink` #f6cf7a di `--warn-bg` #352a10 | 9,48 : 1 |
| `--crit-ink` #f6a3a6 di `--crit-bg` #3a1a1c | 7,96 : 1 |
| `--warn-ink` #f6cf7a di `--bg` #141415 (teks pita padam) | 12,38 : 1 |
| `--ink-3` #8c8c92 di `--raised` #232325 (bujur, label ubin) | 4,69 : 1 |
