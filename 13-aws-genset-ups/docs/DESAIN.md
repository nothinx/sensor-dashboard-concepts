# Desain: Genset & UPS Cabang

## Arah (format lima baris unslop)

Format arah diambil dari [unslop](https://github.com/heydamir/unslop) karya Damir Sokolovsky, lisensi CC BY 4.0.

- **Produk.** Tim fasilitas pusat memastikan setiap cabang tetap menyala saat PLN padam.
- **Karakter.** Tenang, siaga, terukur.
- **Dunia.** Ruang genset, tangki solar, papan ATS (saklar pindah otomatis) dengan pita peringatan.
- **Momen.** Tangki solar per cabang di peta skematik barat ke timur. Isinya abu-abu bila aman, kuning bila waspada,
  merah bila kritis.
- **Tanda tangan.** Pita bergaris kuning-hitam di atas ubin dengan teks "PLN padam sejak 12.09". Hanya muncul di
  cabang yang sedang padam.

## Pertanyaan layar

"Cabang mana yang berisiko mati listrik?" Temuan di bawah judul selalu menyebut satu cabang paling gawat: cabang
tanpa listrik cadangan (PLN padam dan genset mati) didahulukan, lalu cabang kritis lain, lalu waspada.

## Tata letak

Tanpa sidebar, berbeda dari proyek 01, 04, dan 07 yang juga gelap. Urutan: judul + temuan + satu tombol, baris KPI,
lalu peta cabang (dua pertiga lebar) berdampingan dengan detail cabang terpilih. Tabel kejadian PLN padam di bawah.
Di bawah 900 px peta menjadi dua kolom biasa.

## Token

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--bg` / `--deep` / `--surface` / `--raised` | #141415 / #0f0f10 / #19191b / #232325 | ramp graphite unslop |
| `--ink` / `--ink-2` / `--ink-3` | #ededed / #a8a8ad / #8c8c92 | teks utama, kedua, redup |
| `--s1` | #5fb3f3 | seri solar |
| `--s2` | #3fc1b0 | seri baterai UPS, batang baterai |
| `--warn` / `--crit` / `--good` | #f5b83d / #f06a6a / #4cc38a | status saja, selalu dengan ikon + teks |
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
