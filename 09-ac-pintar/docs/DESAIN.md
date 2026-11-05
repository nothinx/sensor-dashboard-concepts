# Desain · Armada AC Pintar

## Arah (format unslop)

Format lima baris dari [unslop](https://github.com/heydamir/unslop) oleh Damir Sokolovsky, CC BY 4.0.

- **Produk.** Tim layanan purnajual melihat AC pelanggan mana yang perlu servis sebelum pelanggan komplain.
- **Karakter.** Hangat, membantu, ringkas.
- **Dunia.** Rumah pelanggan dan kunjungan servis: dinding ruang tamu, unit putih di atas pintu, kertas tiket teknisi.
- **Momen.** Unit AC digambar dengan CSS: layar kecil menunjukkan suhu ruang atau kode galat, lampu status, dan
  aliran udara yang memudar atau berubah warna saat pendinginan lemah.
- **Tanda tangan.** Kartu tiket servis dengan lekuk sobekan dan garis putus-putus. Muncul hanya di panel detail.

## Pertanyaan layar

"Unit mana yang perlu saya hubungi pelanggannya hari ini?" Jawaban terbesar: jumlah unit bermasalah **tanpa
tiket** (KPI pertama, warna aksen). Temuan di bawah judul menyebut jumlahnya dalam kalimat.

## Tata letak

Daftar + detail tiga kolom: daftar unit bermasalah (340 px), detail unit (fluid), konteks per kota dan kode
galat (320 px). Di bawah 1400 px kolom konteks turun ke bawah; di bawah 1100 px semua bertumpuk.

## Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--bg` / `--surface` / `--raised` | `#f6f3ee` / `#fdfbf8` / `#efe9e0` | permukaan netral hangat tipis |
| `--ink` / `--ink-2` / `--ink-3` | `#1f1b16` / `#554c41` / `#6e655a` | tiga peran teks (redup 5,2:1 pada latar) |
| `--accent` | `#b5481f` terakota | angka jawaban, tiket, batang per kota (5,2:1 pada surface) |
| `--s1` / `--s2` / `--s3` | terakota / abu / hijau tua | suhu ruang / suhu set / arus & tekanan |
| status | `--good` `--warn` `--crit` + pasangan `-bg`/`-ink` | chip status selalu ikon + teks |
| radius | kartu 14 px, kontrol 8 px | radius bersarang |
| gerak | `cubic-bezier(0.22, 1, 0.36, 1)`, 120 sampai 150 ms | hover warna, tekan skala 0,98 |

Huruf: **Plus Jakarta Sans** (rancangan Indonesia, ramah, angka tabular) untuk antarmuka;
**JetBrains Mono** untuk ID unit, kode pelanggan, dan sumbu grafik.

## Keputusan

- Warna aksen hanya di angka jawaban, tiket, dan batang per kota. Latar tetap netral.
- Status selalu ikon + teks (`Kritis`, `Perlu servis`, `Offline`), tidak hanya warna.
- Gambar unit dibuat dengan CSS, bukan foto atau ilustrasi generatif, supaya ringan dan statusnya hidup.
  Slot `[LOGO]` di badan unit menunggu aset merek.
- Tombol aksi utama memfilter daftar ke unit tanpa tiket (aksi paling sering), bukan menulis ke database.
