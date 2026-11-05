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
- Kepala: judul 44 px, temuan 20 px; di kanan jam dinding meja dispatcher 48 px mono dan baris akun berisi penanda
  pratinjau.
- Papan SLA = papan dispatcher hijau botol gelap dengan empat lajur menurut sisa waktu tanggap: Lewat batas,
  Kurang dari 1 jam, 1 sampai 8 jam, Lebih dari 8 jam. Kartu tiket kertas berpita atas (abu, peringatan, kritis),
  hitung mundur 56 px, tombol tanggapi selebar kartu. Lajur kosong menampilkan slot putus-putus.
- Di bawahnya tiket berjalan dan kinerja dalam satu lembar menyatu, lalu tabel unit berulang. Di bawah 1100 px
  papan dua lajur; di bawah 900 px satu lajur, lajur kosong disembunyikan, jam dinding disembunyikan.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#fafafa` / `#ffffff` / `#f4f4f5` | ramp graphite terang |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#525252` / `#696969` | tiga peran teks; redup 5,3:1 pada latar |
| `--accent` | `#1f5f4a` hijau botol | tombol primer, badge mitra, batang "Mitra Anda" (teks di atasnya 7,2:1) |
| status | peringatan `#7a3f06`/`#fdf3e2`, kritis `#8f1717`/`#fbe9e9` | sisa waktu, chip status; ≥ 7,5:1 |
| huruf | Onest 400/500/600, Spline Sans Mono 400/500 | antarmuka; nomor tiket, sisa waktu, angka |
| `--papan` / `--papan-rel` / `--papan-ink` | `#183a2f` / `#24493c` / `#d6e4dd` | papan dispatcher, rel lajur, teks lajur (9,5:1) |
| `--papan-terang` / `--papan-lewat` | `#f7fbf9` / `#ffb4ac` | angka lajur / angka lajur lewat batas (7,3:1) |
| `--kertas` | `#fbfaf6` | kartu tiket; `--ink-3` 5,8:1, `--crit-ink` 8,7:1 |
| radius | 3 / 4 / 6 px | kartu tiket / tombol, badge, input / papan |
| skala tipe | 14 / 16 / 18 / 20 / 44 / 48 / 56 px | label / isi / judul kartu / temuan / judul / jam dinding / hitung mundur |

## Keputusan

- Satu tombol primer per kartu ("Tanggapi dan jadwalkan"); tombol lain sekunder.
- Hitung mundur memakai format pendek `3 j 58 m` dengan huruf mono supaya lebar angka stabil saat berubah.
- Warna status hanya untuk sisa waktu dan chip; kerangka tetap netral.
- Notifikasi tiket baru berupa toast 4 detik dengan `role="status"`.
- `[hidden]` dipaksa `display: none` karena `.masuk` dan `.portal` memakai `display: grid`.
- Putaran 2: kisi kartu putih diganti papan berlajur menurut sisa waktu supaya urutan mendesak terbaca dari kiri.
- Tepat satu penanda `data-pratinjau` di kepala; di pratinjau status koneksi di sidebar disembunyikan dan nama
  akun contoh ditulis sebagai peran ("Koordinator Semarang"). Alur login Supabase tidak berubah.
- sloplint: 0 FAIL.
