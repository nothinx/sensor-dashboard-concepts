# Daftar titik ukur stasiun uji akhir

Satu stasiun uji per lini (`stasiun-uji-L1`, `stasiun-uji-L2`), satu pesan per percobaan uji satu unit.
Semua ambang adalah **contoh** dan didefinisikan di `common/aturan.py`.
[REAL DATA: spesifikasi uji akhir dan ambang resmi dari dokumen mutu klien]

| Tag (field) | Nama | Sensor / sumber | Satuan | Rentang ukur | Interval | Lulus bila | Kode gagal |
|---|---|---|---|---|---|---|---|
| `vakum.kurva` | Kurva penurunan tekanan | transduser vakum (pirani) di manifold pompa | Pa | 1 sampai 110.000 | tiap 12 dtk, 0 sampai 300 dtk | - | - |
| `vakum.waktu_capai_s` | Waktu mencapai target vakum | dihitung dari kurva | dtk | 0 sampai 300 | per uji | ≤ 240 dtk ke ≤ 100 Pa | `vakum` |
| `vakum.akhir_pa` | Tekanan akhir | transduser vakum | Pa | 1 sampai 110.000 | per uji | (informasi) | - |
| `bocor_g_tahun` | Laju bocor refrigeran | detektor kebocoran halogen | g/tahun | 0 sampai 20 | per uji | ≤ 3,0 g/tahun | `bocor` |
| `evap_c` | Suhu evaporator setelah 10 menit | termokopel pada pipa evaporator | °C | -40 sampai 40 | per uji | ≤ -12,0 °C | `dingin` |
| `arus_a` | Arus kompresor saat uji | sensor arus (CT) pada suplai kompresor | A | 0 sampai 5 | per uji | 0,6 sampai 1,4 A | `arus` |

## Turunan

| Nilai | Rumus | Target |
|---|---|---|
| First pass yield (FPY) | unit lulus pada percobaan pertama ÷ semua unit percobaan pertama | ≥ 90 % (contoh) |
| Menunggu uji ulang | unit gagal percobaan pertama tanpa percobaan berikutnya | sekecil mungkin |

## Alarm (fungsi change feed)

| Alarm | Tingkat | Aksi yang diharapkan |
|---|---|---|
| Gagal pada percobaan ke-2 | kritis | tarik unit dari lini untuk analisis kerusakan |
| FPY 20 unit terakhir < 90 % | peringatan | periksa stasiun uji dan proses sebelumnya pada lini itu |
