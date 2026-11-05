# Daftar titik · Monitor Oven Reflow SMT

Semua titik adalah **data contoh**. Ganti dengan daftar titik oven asli (`[REAL DATA: point list oven
reflow dan alamat register/OPC UA]`). Toleransi zona bawaan ±3 °C (`ZONE_TOLERANCE_C`).

## Zona (per lini L1 dan L2)

| Zona | Fungsi | Setpoint contoh °C | Keluaran pemanas contoh | Kipas rpm | Status |
|---|---|---|---|---|---|
| Z1 | Pemanasan awal | 120 | 42 % | 1.450 | ok / warn > 2 °C / crit > 3 °C |
| Z2 | Pemanasan awal | 150 | 38 % | 1.450 | sama |
| Z3 | Soak | 165 | 35 % | 1.500 | sama |
| Z4 | Soak | 175 | 33 % | 1.500 | sama |
| Z5 | Soak | 185 | 37 % | 1.500 | sama |
| Z6 | Reflow | 245 | 64 % | 1.800 | sama |
| Z7 | Reflow | 255 | 71 % | 1.800 | sama |
| Z8 | Reflow | 250 | 64 % | 1.800 | sama |
| Z9 | Pendinginan | 120 | 0 % | 2.100 | sama |
| Z10 | Pendinginan | 80 | 0 % | 2.100 | sama |

Field per zona: `actual` (termokopel tipe K zona, °C), `setpoint` (dari PLC oven), `heater_pct` (keluaran
pengendali), `fan_rpm`. Interval 5 detik.

## Oven (per lini)

| Field | Satuan | Rentang wajar contoh | Batas contoh |
|---|---|---|---|
| `o2_ppm` | ppm | 700 sampai 900 | 1.000 ppm (atmosfer nitrogen) |
| `conveyor_mpm` | m/mnt | 0,75 sampai 0,90 | sama dengan resep |
| `conveyor_recipe_mpm` | m/mnt | 0,90 | dari resep |
| `boards_shift` | papan | 0 sampai sekitar 2.200 | direset tiap awal shift |

## Profil papan uji

Papan uji berprobe melewati oven tiap 10 menit per lini; 60 titik suhu papan, 5 detik sekali.
Turunan yang ditampilkan: suhu puncak dan waktu di atas likuidus 217 °C (`LIQUIDUS_C`). Target di dasbor
(45 sampai 90 detik, 235 sampai 250 °C) adalah contoh, `[REAL DATA: lembar data pasta solder klien]`.

## Skenario simulator

| Lini/zona | Perilaku |
|---|---|
| L2 konveyor | Turun dari 0,90 ke 0,75 m/mnt 42 menit sebelum simulator start |
| L2 Z6 | Naik 7 °C dalam 40 menit berikutnya, keluaran pemanas tertahan 100 % (kritis) |
| L1 Z6 | Sempat +3,4 °C selama 45 menit, 18 jam sebelum start (terlihat di tren 24 jam) |
| L2 profil | Puncak papan naik mengikuti Z6 |
