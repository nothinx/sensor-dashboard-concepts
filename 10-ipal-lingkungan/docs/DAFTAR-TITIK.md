# Daftar titik data · IPAL & Emisi Lingkungan

Tag: `<titik>-<parameter>`, mis. `S4-COD`. Interval di mockup 30 detik (`TICK_DETIK`); backfill tiap 2 menit.
Nilai dasar adalah **contoh** untuk mockup; ganti dengan karakter limbah nyata `[REAL DATA: data operasi IPAL]`.

## Titik sampling

| Kode | Nama | Tahap | Baku mutu dinilai |
| --- | --- | --- | --- |
| S1 | Inlet IPAL | Air limbah masuk (influen) | tidak, dipantau |
| S2 | Setelah koagulasi | Koagulasi dan flokulasi | tidak, dipantau |
| S3 | Setelah aerasi | Pengolahan biologis | tidak, dipantau (peringatan dini untuk S4) |
| S4 | Outlet IPAL | Titik buang ke badan air (efluen) | **ya** |

## Parameter

| Parameter | Sensor online | Satuan | Nilai dasar contoh S1 → S4 | Baku mutu contoh (S4) | "Mendekati" |
| --- | --- | --- | --- | --- | --- |
| pH | elektroda pH | | 7,6 → 7,2 | 6 sampai 9 | kurang dari 0,3 dari batas |
| COD | UV-VIS / spektrofotometer online | mg/L | 900 → 55 | maks 100 | ≥ 90 mg/L |
| TSS | sensor kekeruhan terkalibrasi | mg/L | 450 → 30 | maks 100 | ≥ 90 mg/L |
| Amonia (NH3-N) | ion selektif | mg/L | 35 → 2,5 | maks 5 | ≥ 4,5 mg/L |
| Debit | flowmeter elektromagnetik | m³/jam | 18 → 17,2 | tanpa | |
| Suhu | termometer di probe | °C | 31,5 → 29,5 | tanpa | |

Kolom baku mutu **bukan** angka regulasi. Isi dari izin pembuangan air limbah klien
`[REAL DATA: baku mutu sesuai izin]`.

## Skenario simulator

| Skenario | Titik | Waktu (relatif terhadap backfill) | Akibat |
| --- | --- | --- | --- |
| Gangguan aerasi | S3 dan S4, COD | 200 sampai 150 menit sebelumnya | COD S4 puncak ±130 mg/L, kejadian selesai |
| Nitrifikasi turun | S4, NH3-N | 50 menit sebelum sampai 90 menit sesudah | amonia ±6 mg/L, kejadian berlangsung |
| Penerima sibuk | webhook | tiap permintaan ke-4 | HTTP 503, dikirim ulang di percobaan berikutnya |
