# Daftar titik ukur · Perawatan Prediktif Getaran

Satu sensor getaran (kecepatan RMS 10 sampai 1.000 Hz, plus spektrum FFT) dan satu sensor suhu pada rumah
bearing sisi penggerak setiap mesin. Batas zona mengikuti ISO 10816-1 sesuai kelas mesin. Tipe bearing dan
faktor BPFO di bawah ini adalah contoh; isi dari data klien.

## Mesin

| ID | Mesin | Area | Kelas ISO | Daya | Putaran | 1× | Bearing | BPFO | Status skenario contoh |
|---|---|---|---|---|---|---|---|---|---|
| K-02 | Kompresor udara K-02 | Kompresor & utilitas | II | 55 kW | 1.488 rpm | 24,8 Hz | `[REAL DATA]` (contoh 6309) | 88,8 Hz | cacat lintasan luar, zona C |
| P-01 | Pompa air pendingin P-01 | Kompresor & utilitas | II | 30 kW | 2.950 rpm | 49,2 Hz | `[REAL DATA]` (contoh 6308) | 150,9 Hz | normal, zona B |
| K-01 | Kompresor udara K-01 | Kompresor & utilitas | II | 55 kW | 1.488 rpm | 24,8 Hz | `[REAL DATA]` (contoh 6309) | 88,8 Hz | normal, zona B |
| BL-L2 | Blower oven Line 2 | SMT Line 2 | I | 7,5 kW | 2.880 rpm | 48,0 Hz | `[REAL DATA]` (contoh 6205) | 146,4 Hz | normal, zona B |
| BL-L1 | Blower oven Line 1 | SMT Line 1 | I | 7,5 kW | 2.880 rpm | 48,0 Hz | `[REAL DATA]` (contoh 6205) | 146,4 Hz | normal, zona B |
| AHU-1 | AHU produksi 1 | HVAC produksi | II | 18,5 kW | 1.460 rpm | 24,3 Hz | `[REAL DATA]` (contoh 6310) | 74,5 Hz | normal, zona A |
| CV-TV | Konveyor perakitan TV | Perakitan TV | I | 5,5 kW | 1.420 rpm | 23,7 Hz | `[REAL DATA]` (contoh 6206) | 72,2 Hz | sensor offline |

## Besaran per mesin

| Besaran | Kolom | Satuan | Rentang | Interval | Peringatan | Kritis |
|---|---|---|---|---|---|---|
| Kecepatan getaran RMS | `rms.rms_mm_s` | mm/s | 0 sampai 20 | 10 menit | masuk zona C | masuk zona D |
| Suhu rumah bearing | `rms.suhu_c` | °C | 20 sampai 110 | 10 menit | `[REAL DATA: batas pabrikan]` | `[REAL DATA]` |
| Putaran | `rms.rpm` | rpm | sesuai pelat nama | 10 menit | - | - |
| Spektrum kecepatan | `spektrum.amplitudo` | mm/s per garis | 0 sampai 400 Hz, 200 garis, resolusi 2 Hz | 1 jam | puncak di BPFO/BPFI/BSF naik | - |

## Batas zona ISO 10816-1 (mm/s RMS)

| Kelas | Contoh mesin | A/B | B/C | C/D |
|---|---|---|---|---|
| I | motor kecil hingga 15 kW | 0,71 | 1,8 | 4,5 |
| II | mesin menengah 15 sampai 75 kW | 1,12 | 2,8 | 7,1 |
| III | mesin besar, pondasi kaku | 1,8 | 4,5 | 11,2 |
| IV | mesin besar, pondasi lunak | 2,8 | 7,1 | 18,0 |

Zona A: mesin baru. Zona B: layak operasi jangka panjang. Zona C: tidak layak jangka panjang, rencanakan
perbaikan. Zona D: getaran dapat merusak mesin.

## Catatan lapangan

- Pasang sensor pada rumah bearing dengan stud atau magnet datar, arah radial horizontal, di titik yang sama
  setiap kali supaya tren bisa dibandingkan.
- BPFO dihitung dari geometri bearing: `BPFO = (n/2) × f_putar × (1 − (d/D) × cos α)`, dengan n jumlah bola,
  d diameter bola, D diameter pitch, α sudut kontak. Simpan hasil `BPFO / f_putar` di kolom `faktor_bpfo`.
