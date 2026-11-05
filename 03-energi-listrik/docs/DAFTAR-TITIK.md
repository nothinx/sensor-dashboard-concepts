# Daftar titik ukur · Pemantauan Energi Listrik

Delapan power meter tiga fasa, satu per panel. Nilai rentang adalah perkiraan desain untuk data contoh;
merek, alamat Modbus, dan rasio CT diisi dari data klien.

## Meter

| Tag | Panel | Area dilayani | Beban puncak perkiraan | Protokol | Alamat |
|---|---|---|---|---|---|
| PM-MDP | Panel utama (MDP) | Seluruh pabrik | 1.600 kW | Modbus TCP | `[REAL DATA: IP / unit id]` |
| PM-SMT | SDP SMT | Oven reflow (2 lini) | 500 kW | Modbus TCP | `[REAL DATA]` |
| PM-KMP | SDP Kompresor | Kompresor & utilitas | 290 kW | Modbus TCP | `[REAL DATA]` |
| PM-HVAC | SDP HVAC | HVAC produksi | 330 kW | Modbus TCP | `[REAL DATA]` |
| PM-TV | SDP Perakitan TV | Perakitan TV | 180 kW | Modbus TCP | `[REAL DATA]` |
| PM-KLK | SDP Perakitan kulkas | Perakitan kulkas | 150 kW | Modbus TCP | `[REAL DATA]` |
| PM-GDG | SDP Gudang | Gudang & cold storage | 90 kW | Modbus TCP | `[REAL DATA]` |
| PM-KTR | SDP Kantor | Kantor & lain-lain | 50 kW | Modbus TCP | `[REAL DATA]` |

## Besaran per meter

| Besaran | Kolom | Satuan | Rentang wajar | Interval | Ambang peringatan | Sumber |
|---|---|---|---|---|---|---|
| Energi aktif per interval | `pembacaan.kwh` | kWh | 0 sampai 400 | 15 menit | - | selisih register energi impor |
| Daya aktif rata-rata | `pembacaan.kw_rata` | kW | 0 sampai 1.600 | 15 menit | - | `kwh / 0,25` |
| Demand maksimum | `pembacaan.kw_maks` | kW | 0 sampai 1.700 | 15 menit | MDP > `batas_kontrak_kw` | register demand meter |
| Faktor daya rata-rata | `pembacaan.pf_rata` | - | 0,70 sampai 0,99 | 15 menit | < 0,85 | register PF |
| Daya aktif sesaat | `sesaat.kw` | kW | 0 sampai 1.700 | 60 detik | - | register P total |
| Tegangan R-N, S-N, T-N | `sesaat.v_r/v_s/v_t` | V | 207 sampai 253 | 60 detik | `[REAL DATA: batas tegangan klien]` | register V L-N |
| Arus R, S, T | `sesaat.i_r/i_s/i_t` | A | 0 sampai rating CT | 60 detik | ketidakseimbangan > 10 % | register I |
| Faktor daya sesaat | `sesaat.pf` | - | 0,70 sampai 0,99 | 60 detik | < 0,85 | register PF |
| THD arus | `sesaat.thd_i` | % | 2 sampai 25 | 60 detik | > 15 % | register THD-I |

## Catatan lapangan

- Faktor daya di bawah 0,85 terkena biaya kelebihan kVARh dari PLN; nilai ambang tersimpan di tabel
  `konfigurasi` dan bisa disesuaikan.
- Ambang THD arus 15 % adalah nilai awal dasbor. Batas yang mengikat bergantung pada rasio hubung
  singkat titik sambung; sesuaikan dengan kajian kualitas daya klien `[REAL DATA]`.
- Peta register Modbus berbeda per merek meter. Cantumkan peta register di dokumen ini setelah merek
  meter klien diketahui.
