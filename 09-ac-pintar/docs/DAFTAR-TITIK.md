# Daftar titik data · Armada AC Pintar

Satu "titik" per unit AC terhubung. Setiap unit mengirim satu paket telemetri berisi titik di bawah.
Interval di mockup 30 detik (`TICK_DETIK`); interval nyata bergantung modul Wi-Fi unit `[REAL DATA: interval kirim modul]`.
Rentang dan ambang di tabel adalah **contoh** untuk mockup; kalibrasi dengan spesifikasi tiap model
`[REAL DATA: spesifikasi teknis per model]`.

| Tag | Nama | Sumber di unit | Satuan | Rentang wajar | Peringatan (perlu servis) | Kritis | Kolom DB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ON` | Status menyala | kontrol unit | ya/tidak | | | | `menyala` |
| `TSET` | Suhu set | remote / aplikasi | °C | 16 sampai 30 | | | `suhu_set` |
| `TRM` | Suhu ruang | termistor unit dalam | °C | 18 sampai 35 | > `TSET` + 2,5 saat menyala | sensor galat (`E1`) | `suhu_ruang` |
| `TOUT` | Suhu luar | termistor unit luar | °C | 20 sampai 40 | | | `suhu_luar` |
| `ICMP` | Arus kompresor | sensor arus unit luar | A | 0 sampai 3,9 × PK | > 125 % nominal | kode `E5` | `arus_kompresor` |
| `PSUC` | Tekanan hisap (perkiraan) | dihitung dari suhu pipa hisap | psi | 120 sampai 145 (R32, menyala) | < 115 | kode `P2` | `tekanan_hisap` |
| `ERR` | Kode galat | kontrol unit | kode | | | ada kode | `kode_galat` |
| `LAST` | Waktu kirim terakhir | server | waktu | | | > 15 menit (offline) | `waktu` |

## Kode galat (generik, untuk mockup)

| Kode | Arti | Tindakan |
| --- | --- | --- |
| `E1` | Sensor suhu ruang terbuka atau korsleting | Periksa konektor sensor ruang, ganti sensor bila perlu |
| `E5` | Arus kompresor melebihi batas | Bersihkan kondensor, periksa kapasitor dan tegangan suplai |
| `P2` | Tekanan hisap rendah | Periksa kebocoran pipa, isi ulang refrigeran sesuai spesifikasi |
| `F0` | Unit tidak mengirim data | Periksa modul Wi-Fi dan jaringan pelanggan |

`[REAL DATA: tabel kode galat resmi]` menggantikan tabel di atas sebelum dipakai.

## Data pelanggan

Hanya `pelanggan_ref` (kode samaran). Pemetaan ke identitas pelanggan disimpan di sistem CRM klien, bukan di
database ini, agar dasbor dapat dibuka tim yang lebih luas tanpa membuka data pribadi.
