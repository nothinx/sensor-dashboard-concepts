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
- Portal: sidebar ramping 208 px (logo, 4 tautan, status koneksi), konten fluid hingga 1600 px.
- Papan SLA: kisi kartu `auto-fill` minimal 300 px; di bawahnya tiket berjalan (lebar) + kinerja (sempit),
  lalu tabel unit berulang. Di bawah 1200 px bertumpuk; di bawah 900 px sidebar menjadi baris atas.

## Token

| Token | Nilai | Pakai |
|---|---|---|
| `--bg` / `--surface` / `--raised` | `#fafafa` / `#ffffff` / `#f4f4f5` | ramp graphite terang |
| `--ink` / `--ink-2` / `--ink-3` | `#171717` / `#525252` / `#696969` | tiga peran teks; redup 5,3:1 pada latar |
| `--accent` | `#1f5f4a` hijau botol | tombol primer, badge mitra, batang "Mitra Anda" (teks di atasnya 7,2:1) |
| status | peringatan `#7a3f06`/`#fdf3e2`, kritis `#8f1717`/`#fbe9e9` | sisa waktu, chip status; ≥ 7,5:1 |
| huruf | Onest 400/500/600, Spline Sans Mono 400/500 | antarmuka; nomor tiket, sisa waktu, angka |
| radius | 6 / 8 / 14 / 16 px | badge / tombol & input / panel & kartu / kartu masuk |

## Keputusan

- Satu tombol primer per kartu ("Tanggapi dan jadwalkan"); tombol lain sekunder.
- Hitung mundur memakai format pendek `3 j 58 m` dengan huruf mono supaya lebar angka stabil saat berubah.
- Warna status hanya untuk sisa waktu dan chip; kerangka tetap netral.
- Notifikasi tiket baru berupa toast 4 detik dengan `role="status"`.
- `[hidden]` dipaksa `display: none` karena `.masuk` dan `.portal` memakai `display: grid`.
- sloplint: 0 FAIL.
