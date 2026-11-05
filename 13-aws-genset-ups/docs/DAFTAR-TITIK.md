# Daftar titik: genset, UPS, dan PLN per cabang

Setiap cabang mengirim satu pesan telemetri berisi semua titik di bawah. Interval simulator 10 detik, riwayat
disimpan tiap ±1 menit. Ambang adalah **contoh**; nilai final disepakati dengan tim fasilitas klien
[REAL DATA: ambang resmi klien dan spesifikasi genset/UPS tiap cabang].

| Tag (field) | Nama | Sumber | Satuan | Rentang | Waspada | Kritis |
| --- | --- | --- | --- | --- | --- | --- |
| `pln.ada` | Pasokan PLN | kontak ATS | boolean | ada/padam | padam dan genset menyala | padam dan genset tidak menyala |
| `genset.jalan` | Genset menyala | kontak status genset | boolean | | | lihat baris di atas |
| `genset.bbm` | Sisa solar | sensor level tangki | % tangki | 0 sampai 100 | < 40 | < 20 |
| `genset.jamJalan` | Jam jalan genset | kontroler genset | jam | 0 ke atas | | |
| `genset.tegangan` | Tegangan keluaran (fasa-netral) | kontroler genset | V | 0 sampai 260 | | di luar 207 sampai 253 saat menyala |
| `genset.frekuensi` | Frekuensi keluaran | kontroler genset | Hz | 0 sampai 55 | | di luar 49 sampai 51 saat menyala |
| `ups.baterai` | Muatan baterai UPS | UPS (SNMP/Modbus) | % | 0 sampai 100 | < 60 | < 30 |
| `ups.runtime` | Sisa runtime UPS | UPS | menit | 0 sampai 60 | | |
| `ups.beban` | Beban UPS | UPS | % kapasitas | 0 sampai 100 | > 80 | |

## Aturan status cabang

Status = tingkat tertinggi dari semua aturan (`app/lib/inti.mjs`, diuji di `app/uji.mjs`):

1. **Kritis**: PLN padam dan genset tidak menyala; solar < 20 %; baterai UPS < 30 %; tegangan atau frekuensi
   genset di luar batas saat menyala.
2. **Waspada**: solar < 40 %; baterai UPS < 60 %; beban UPS > 80 %; PLN padam dan beban ditanggung genset.
3. **Normal**: selain itu.

## Cabang contoh

| Kode | Kota | Genset | UPS |
| --- | --- | --- | --- |
| MDN, BKS, YOG, DPS | Medan, Bekasi, Yogyakarta, Denpasar | 100 kVA | 20 kVA |
| PLM, BDG, SBY, BPN | Palembang, Bandung, Surabaya, Balikpapan | 150 kVA | 30 kVA |
| JKT, SMG, MLG, MKS | Jakarta, Semarang, Malang, Makassar | 200 kVA | 40 kVA |

## Skenario simulator

| Cabang | Kejadian |
| --- | --- |
| Makassar | PLN padam sejak 14 menit sebelum start, genset gagal menyala; teknisi menyalakannya saat baterai UPS 15 % |
| Palembang | PLN padam sejak ±3 jam, genset menyala, solar turun ke ±35 % |
| Balikpapan | padam 5 jam (14 sampai 9 jam lalu), solar tersisa 17 % dan belum diisi ulang |
| Medan, Semarang | padam singkat dalam 24 jam terakhir, sudah pulih |
| Denpasar | beban UPS ±84 % |
