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
| Tangki 40×56 px (30×52 px di ≤ 1500 px) dengan garis ukur 25/50/75 seperti kaca duga | Terbaca sebagai alat ukur; dipendekkan supaya ubin berpita padam tetap muat di lajur 160 px tanpa isi meluber |
| Pita PLN padam setinggi 20 px, teksnya di pelat hitam di atas garis kuning-hitam, tepi ubin kuning | Tanda tangan lebih tegas tanpa menambah warna |
| Detail cabang memuat diagram satu garis papan ATS (PLN, genset, pisau ATS, UPS, beban) | Dunia papan ATS hadir di permukaan kedua; posisi pisau langsung menjawab "beban ditanggung siapa" |
| Panel siku 2 px dengan garis atas lebih terang, bukan kartu membulat 12 px | Terasa pelat panel listrik |
| Tepat satu penanda `data-pratinjau` di header; di mode pratinjau status koneksi disembunyikan | Brief putaran 2, temuan 4 |
| Satu skala tipe di `:root`: 13 / 15 / 17 / 20 / 28 / 40 px (`--t-*`), tak ada `font-size` angka di luar `:root`. Label | Skala tipe 1920: isi 15 px, label 13 sampai 14 px, judul 34 px, angka kritis 40 px, angka lain 30 px, teks grafik 13 px (`--chart-fs`) | Brief putaran 2, temuan 2 | chip 13, isi 15, temuan 17, judul detail | Skala tipe 1920: isi 15 px, label 13 sampai 14 px, judul 34 px, angka kritis 40 px, angka lain 30 px, teks grafik 13 px (`--chart-fs`) | Brief putaran 2, temuan 2 | nilai detail 20, judul layar | Skala tipe 1920: isi 15 px, label 13 sampai 14 px, judul 34 px, angka kritis 40 px, angka lain 30 px, teks grafik 13 px (`--chart-fs`) | Brief putaran 2, temuan 2 | KPI 28, angka kritis 40. Line-height isi 1,5, judul 1,2, angka 1,0 | Brief putaran 3: skala liar dan huruf kecil yang menempel |
| Font Sora + Martian Mono diganti Red Hat Text 400/500/600 saja | Sora lebar dan geometris sehingga label 13 px terasa renggang; Martian Mono membuat "100 %", "siaga", cap waktu, dan sumbu terbaca seperti kode. Red Hat Text dirancang untuk teks layar kecil, x-height lega, angka tabular. Mono dihapus: tak ada kode yang menuntutnya (kode cabang MKS cukup sans redup) |
| Angka: `tabular-nums lining-nums` di `body`, satuan lewat `<small class="u">` 13 px redup setelah `&thinsp;` | Angka diperlakukan sebagai tipografi; satuan tidak ikut ukuran besar |
| Tanpa letter-spacing kecuali judul 28 px (-0,01em) | Brief putaran 3, temuan 1 |
| Ubin: dua baris kunci-nilai (Genset Siaga, UPS 100 %) + garis baterai; di ≤ 1500 px kode, bujur, dan kata "PLN padam sejak" diringkas jadi "Padam 09.43" | Di 1440 lebar ubin 126 px; versi lama meluber keluar ubin. Bujur tetap terbaca dari sumbu |
| KPI: baris nilai setinggi 40 px di keempat kolom | Label, angka, dan keterangan sejajar walau angka kritis lebih besar |
| Satu radius 2 px (termasuk chip status bersama), garis 1 px; garis atas pelat 2 px satu-satunya pengecualian | Detail seragam, kesan pelat panel tetap |
| Kunci ubin (tangki = sisa solar, garis = baterai UPS) di kepala panel, bukan kalimat panjang ber-titik-koma | Bahasa lebih ringkas; penjelasan visual dekat yang dijelaskan |

## Token

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--bg` / `--deep` / `--surface` / `--raised` | #141415 / #0f0f10 / #19191b / #202022 | ramp graphite unslop; `--raised` diturunkan supaya ubin lebih tenang |
| `--ink` / `--ink-2` / `--ink-3` | #ededed / #b0b0b5 / #8f8f95 | teks utama, kedua, redup (sedikit lebih terang untuk huruf 13 px) |
| `--s1` | #5fb3f3 | seri solar |
| `--s2` | #3fc1b0 | seri baterai UPS, batang baterai |
| `--warn` / `--crit` / `--good` | #f5b83d / #f06a6a / #4cc38a | status saja, selalu dengan ikon + teks |
| `--line` / `--line-2` / `--line-3` | alfa 0,08 / 0,14 / 0,26 | pemisah, tepi ubin, garis atas panel | `--line-3` | rgba(237,237,237,0.28) | garis atas panel, sumbu, tepi tangki | sumbu |
| `--lajur-h` / `--sumbu-h` | 160 px / 40 px | tinggi lajur ubin dan pita sumbu |
| `--t-13` … `--t-40` | 13 / 15 / 17 / 20 / 28 / 40 px | satu-satunya ukuran huruf |
| `--sp-1` … `--sp-7` | 4 / 8 / 12 / 16 / 24 / 32 / 40 px | jarak; tepi halaman `--tepi` 32 px (16 px di HP), isi panel menjorok 24 px |
| `--r` | 2 px | satu radius untuk panel, ubin, tombol, chip |
| `--chart-font` / `--chart-fs` / `--tip-fs` / `--st-fs` | Red Hat Text / 13 px | teks grafik, tooltip, chip status (bukan mono) |
| Huruf | Red Hat Text 400/500/600 | satu keluarga untuk teks dan angka |

Tombol utama berwarna off-white dengan teks gelap (anjuran unslop untuk tema gelap). Gerak hanya perubahan warna
150 ms dan tekan 0,98, dengan fallback `prefers-reduced-motion`.

## Kontras (diukur)

| Pasangan | Rasio |
| --- | --- |
| `--ink-3` #8f8f95 di `--surface` #19191b | 5,46 : 1 |
| `--ink-2` #b0b0b5 di `--raised` #202022 | 7,53 : 1 |
| `--warn-ink` #f6cf7a di `--warn-bg` #352a10 | 9,48 : 1 |
| `--crit-ink` #f6a3a6 di `--crit-bg` #3a1a1c | 7,96 : 1 |
| `--warn-ink` #f6cf7a di `--bg` #141415 (teks pita padam) | 12,38 : 1 |
| `--ink-3` #8f8f95 di `--raised` #202022 (bujur, label ubin) | 5,06 : 1 |
| `--ink-3` #8f8f95 di `--selected` #24272b (ubin terpilih) | 4,66 : 1 |
