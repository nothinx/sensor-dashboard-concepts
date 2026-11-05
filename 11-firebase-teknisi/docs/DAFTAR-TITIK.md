# Daftar titik sensor

Delapan mesin contoh, masing-masing satu besaran yang dipantau. Ambang adalah **contoh**; nilai final dari tim
perawatan klien [REAL DATA: ambang resmi dan spesifikasi mesin]. Simulator menulis satu bacaan per mesin tiap
15 detik (riwayat awal 24 jam tiap 20 menit).

| ID | Mesin | Lokasi | Besaran | Satuan | Normal | Ambang (buat tugas) | Skenario simulator |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-01 | Pompa air pendingin P-01 | Gedung utilitas | Getaran (RMS) | mm/s | 2,4 | > 4,5 | naik sejak 30 menit lalu, memicu tugas baru prioritas tinggi |
| OV-L2 | Oven reflow Line 2, zona 6 | Ruang SMT | Suhu | °C | 245 | > 250 | naik sejak 40 menit lalu, memicu tugas baru |
| K-02 | Kompresor udara K-02 | Gedung utilitas | Suhu keluaran | °C | 82 | > 95 | naik sejak 75 menit lalu; tugas sudah diambil Teknisi shift 1 |
| CV-TV | Konveyor perakitan TV | Perakitan TV | Arus motor | A | 6,2 | > 8,5 | normal |
| AHU-1 | AHU produksi 1 | Atap gedung produksi | Suhu udara pasok | °C | 16 | > 20 | tugas sedang dikerjakan Teknisi shift 2 |
| CH-01 | Chiller 1 | Gedung utilitas | Tekanan kondensor | bar | 12,5 | > 16 | tugas kemarin, selesai |
| GS-SBY | Genset Cabang Surabaya | Cabang Surabaya | Suhu air pendingin | °C | 78 | > 95 | normal |
| MDP | Panel listrik utama | Ruang panel | Suhu busbar | °C | 52 | > 70 | tugas pagi ini, selesai |

## Aturan pembuatan tugas

1. Bacaan baru dengan `nilai > ambang` (lebih besar, bukan sama dengan).
2. Belum ada tugas `baru` atau `dikerjakan` untuk mesin yang sama.
3. Prioritas `tinggi` bila nilai lebih dari 115 % ambang, selain itu `sedang`.

Semua ambang di atas adalah ambang atas. Besaran yang buruk bila terlalu rendah (mis. tekanan hisap) perlu field
`arah` tambahan di dokumen mesin; belum dibutuhkan untuk delapan mesin contoh.
