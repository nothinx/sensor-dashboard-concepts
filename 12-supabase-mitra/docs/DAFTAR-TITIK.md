# Daftar data · Portal Mitra Servis

Portal ini tidak membaca sensor langsung; yang dipantau adalah **tiket servis** dan **waktu tanggap mitra**.
Semua nilai di bawah adalah contoh. Nilai resmi: `[REAL DATA: kontrak kemitraan servis dan SOP purnajual]`.

## Status tiket

| Status | Arti | Diubah oleh | Kolom waktu |
|---|---|---|---|
| `baru` | tiket masuk dari pabrik, belum ditanggapi mitra | sistem pabrik | `dibuat_pada` |
| `dijadwalkan` | mitra menanggapi dan menjadwalkan kunjungan | mitra (tombol "Tanggapi dan jadwalkan") | `ditanggapi_pada`, `jadwal_kunjungan` |
| `dikerjakan` | teknisi di lokasi | mitra / sistem | |
| `selesai` | perbaikan selesai | mitra / sistem | `selesai_pada` |

## Prioritas dan SLA waktu tanggap (contoh)

| Prioritas | Batas tanggap | Contoh keluhan |
|---|---|---|
| `tinggi` | 4 jam | AC tidak dingin, TV mati total, kulkas tidak dingin |
| `sedang` | 8 jam | AC menetes, layar bergaris, pintu kulkas tidak rapat |
| `rendah` | 24 jam | remote tidak berfungsi, bunga es berlebih, dengung |

Ubah nilai di tabel `sla`; tiket baru otomatis memakai nilai terbaru.

## Ukuran yang ditampilkan

| Ukuran | Rumus | Satuan | Tampil di |
|---|---|---|---|
| Sisa waktu tanggap | `batas_tanggap - sekarang` (negatif = terlambat) | jam dan menit | papan SLA, diperbarui tiap 30 detik |
| Waktu tanggap terpakai | `1 - sisa / (batas_tanggap - dibuat_pada)` | % | batang di kartu tiket |
| Waktu tanggap rata-rata | rata-rata `ditanggapi_pada - dibuat_pada`, 30 hari | menit | panel kinerja |
| Tepat SLA | % tiket dengan `ditanggapi_pada ≤ batas_tanggap`, 30 hari | % | panel kinerja |
| Unit berulang | unit dengan ≥ 2 tiket dalam 30 hari | jumlah tiket | tabel unit |

Ambang tampilan papan SLA: sisa < 60 menit diberi warna peringatan; sisa < 0 diberi warna kritis dan bingkai
merah.

## Data unit

| Kolom | Contoh | Catatan |
|---|---|---|
| `serial` | `AC1-SMG-00012` | format contoh; asli `[REAL DATA: format nomor seri]` |
| `model` | AC split 1 PK, TV LED 43 inci, Kulkas 2 pintu | contoh |
| `pelanggan_ref` | `PLG-09E078` | ID tersamar; data pribadi pelanggan tetap di CRM klien |
