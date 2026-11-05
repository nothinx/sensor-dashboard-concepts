# Daftar titik · Jejak Mutu

Semua isi tabel ini adalah **contoh** untuk mockup. Daftar stasiun, besaran uji, batas, dan kode cacat resmi:
`[REAL DATA: dari prosedur QC dan sistem MES klien]`.

## Stasiun

| Urutan | Kode | Nama | Sumber data | Yang dicatat |
|---|---|---|---|---|
| 1 | `PERAKITAN` | Perakitan | pemindai label nomor seri di awal lini | unit dibuat, operator |
| 2 | `UJI-FUNGSI` | Uji fungsi | jig uji fungsi | hasil, besaran listrik, kode cacat |
| 3 | `UJI-AKHIR` | Uji akhir | stasiun uji keselamatan + visual | hasil, arus bocor hipot, kode cacat |
| 4 | `KEMAS` | Kemas | pemindai di meja kemas | unit selesai |

## Besaran uji

| Tag (`nilai.*`) | Nama | Produk | Stasiun | Satuan | Rentang contoh | Batas lulus |
|---|---|---|---|---|---|---|
| `daya_w` | Daya saat uji pola | TV | UJI-FUNGSI | W | 48 sampai 95 | `[REAL DATA: per model]` |
| `arus_kompresor_a` | Arus kompresor saat start | Kulkas | UJI-FUNGSI | A | 0,9 sampai 1,4 | `[REAL DATA: per model]` |
| `hipot_ma` | Arus bocor uji tegangan tinggi | semua | UJI-AKHIR | mA | 0,2 sampai 0,9 | `[REAL DATA: sesuai standar keselamatan yang dipakai klien]` |

## Kode cacat contoh

| Kode | Produk | Terdeteksi di | Contoh catatan |
|---|---|---|---|
| `PNL-02` | TV | UJI-FUNGSI | Garis vertikal tipis pada panel saat uji pola warna merah |
| `AUD-01` | TV | UJI-FUNGSI | Suara speaker kiri pecah pada volume di atas 80 |
| `PWR-03` | TV | UJI-FUNGSI | Unit mati sendiri setelah 20 menit uji panas |
| `IR-01` | TV | UJI-AKHIR | Sensor remote tidak merespons dari jarak 5 meter |
| `KSM-02` | TV, kulkas | UJI-AKHIR | Goresan atau penyok kosmetik |
| `KMP-03` | Kulkas | UJI-FUNGSI | Kompresor berdengung keras saat start pertama |
| `REF-02` | Kulkas | UJI-FUNGSI | Suhu freezer belum turun ke -15 °C setelah 90 menit |
| `SEG-01` | Kulkas | UJI-AKHIR | Karet pintu tidak rapat, celah 2 mm di sisi engsel |

## Format nomor seri contoh

`<KODE MODEL>-<YYMM>-<URUT 6 DIGIT>`, misalnya `TV43-2611-000414`. Format asli: `[REAL DATA: format label
nomor seri klien]`; sesuaikan pola validasi `SERIAL_RE` di `api/app.py`.

## Model contoh

| Kode | Model | Lini |
|---|---|---|
| `TV32` | TV LED 32 inci | Lini TV 1 |
| `TV43` | TV LED 43 inci | Lini TV 1 |
| `TV50` | TV LED 50 inci | Lini TV 2 |
| `KL2P` | Kulkas 2 pintu | Lini kulkas |
