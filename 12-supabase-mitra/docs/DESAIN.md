# Desain · Portal Mitra Servis

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Mitra servis resmi mengelola tiket perbaikan yang dikirim pabrik dan menjaga waktu tanggap SLA.
- **Karakter.** Profesional, adil, jelas.
- **Dunia.** Meja dispatcher dan papan jadwal: kartu tiket, jam dinding, nama mitra di setiap berkas.
- **Momen.** Papan SLA: kartu tiket diurutkan dari sisa waktu paling sedikit, angka hitung mundur besar dan
  batang waktu terpakai yang berubah peringatan lalu merah saat mendekati dan melewati batas.
- **Tanda tangan.** Badge kode mitra (mis. `SMG`) yang menggantung di pojok kanan atas setiap kartu tiket,
  seperti label map. Hanya muncul di kartu tiket.

## Pertanyaan layar

"Tiket mana yang harus saya tanggapi sekarang supaya tidak melanggar SLA?" Jawabannya kartu pertama di papan
dan kalimat temuan di bawah judul (jumlah tiket menunggu dan sisa waktu yang paling mendesak, atau jumlah tiket
yang sudah terlambat).

"Adil" diterjemahkan ke panel kinerja: mitra melihat angkanya sendiri di samping rata-rata semua mitra, tanpa
nama atau peringkat mitra lain.

## Tata letak

- Layar masuk: kartu 400 px di tengah (satu-satunya tugas di layar itu).
- Layar masuk: berkas kertas dengan tab "Mitra" di atas papan hijau gelap; logo klien di dasar kartu.
- Portal: sidebar ramping 200 px (logo, 4 tautan, status koneksi), konten fluid selebar layar.
- Kepala: judul 28 px, temuan 20 px (maks 60ch); di kanan jam dinding meja dispatcher 28 px dan baris akun berisi
  penanda pratinjau. Angka terbesar di layar adalah hitung mundur kartu, bukan judul.
- Papan SLA = papan dispatcher hijau botol gelap dengan empat lajur menurut sisa waktu tanggap: Lewat batas,
  Kurang dari 1 jam, 1 sampai 8 jam, Lebih dari 8 jam. Kartu tiket kertas berpita atas (abu, peringatan, kritis),
  hitung mundur 40 px, tombol tanggapi selebar kartu. Lajur kosong menampilkan slot putus-putus. Isi kartu berbaris
  tetap (nomor, keluhan min. dua baris, unit dua baris, sisa waktu, batang, tombol) supaya kartu antarlajur sejajar.
- Di bawahnya tiket berjalan dan kinerja dalam satu lembar menyatu, lalu tabel unit berulang. Di bawah 1100 px
  papan dua lajur; di bawah 900 px satu lajur, lajur kosong disembunyikan, jam dinding disembunyikan.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#f1f2ef` / `#fdfdfb` / `#e9ebe6` | ramp abu hangat, permukaan sedikit diwarnai |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#4a4a4a` / `#626262` | tiga peran teks; redup 5,4:1 pada latar |
| `--accent` | `#1f5f4a` hijau botol | tombol primer, badge mitra, batang "Mitra Anda" (teks di atasnya 7,2:1) |
| status | peringatan `#7a3f06`/`#fdf3e2`, kritis `#8f1717`/`#fbe9e9` | sisa waktu, chip status; ≥ 7,5:1 |
| huruf | Schibsted Grotesk 400/500/600 | satu keluarga untuk semua teks dan angka; tanpa mono |
| `--papan` / `--papan-rel` / `--papan-ink` | `#183a2f` / `#2a5143` / `#d6e4dd` | papan dispatcher, rel lajur, teks lajur (9,5:1) |
| `--papan-terang` / `--papan-lewat` | `#f7fbf9` / `#ffb4ac` | angka lajur / angka lajur lewat batas (7,3:1) |
| `--kertas` | `#fbfaf6` | kartu tiket; `--ink-3` 5,8:1, `--crit-ink` 8,7:1 |
| `--r-s` / `--r-l` | 4 / 8 px | kartu tiket, tombol, badge, chip, input / papan, lembar panel |
| garis | 1 px | semua garis dan border; pita atas kartu 4 px adalah penanda status |
| `--fs-1`…`--fs-6` | 13 / 15 / 17 / 20 / 28 / 40 px | label & meta / isi & tabel / judul kartu & satuan / temuan & judul panel / judul halaman & jam / hitung mundur |
| `--sp-1`…`--sp-8` | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 px | semua jarak |

## Keputusan

- Satu tombol primer per kartu ("Tanggapi dan jadwalkan"); tombol lain sekunder.
- Putaran 3: hitung mundur ditulis `1 jam 10 menit`; angka 40 px tabular, satuan 17 px lebih ringan dan abu,
  dipisah spasi tipis. Format `1 j 10 m` dalam mono lebar sulit dibaca dan singkatannya tidak lazim. Tiket lewat
  batas ditandai label "Terlambat" di atas angka, bukan tanda `+`.
- Warna status hanya untuk sisa waktu dan chip; kerangka tetap netral.
- Notifikasi tiket baru berupa toast 4 detik dengan `role="status"`.
- `[hidden]` dipaksa `display: none` karena `.masuk` dan `.portal` memakai `display: grid`.
- Putaran 2: kisi kartu putih diganti papan berlajur menurut sisa waktu supaya urutan mendesak terbaca dari kiri.
- Tepat satu penanda `data-pratinjau` di kepala; di pratinjau status koneksi di sidebar disembunyikan dan nama
  akun contoh ditulis sebagai peran ("Koordinator Semarang"). Alur login Supabase tidak berubah.
- Putaran 3: Onest + Spline Sans Mono diganti Schibsted Grotesk saja. Angka tabular Onest berjarak renggang
  ("1 1 1"), mono membuat nomor tiket dan prioritas terasa kecil dan teknis. Schibsted punya x-height lega,
  angka tabular rapat, dan nada surat kabar yang cocok untuk meja dispatcher. Tabular hanya dipasang pada hitung
  mundur, jumlah lajur, dan kolom angka tabel, karena titik dan koma tabularnya terlalu lebar ("09 . 25").
- Putaran 3: satu skala tipe enam langkah di `:root`; tak ada `font-size` px di luar token.
- Putaran 3: status "Dijadwalkan" dan "Dikerjakan" memakai ikon sendiri (jam, lingkaran setengah); ikon bersama
  "off" dan "warn" berarti mati dan peringatan.
- Putaran 3: catatan kinerja menyebut selisih nyata ("29 menit lebih cepat dari rata-rata semua mitra") dan
  istilah "sandi" menjadi "kata sandi"; status koneksi "Supabase Realtime" menjadi "Tersambung, diperbarui …".
- sloplint: 0 FAIL.
