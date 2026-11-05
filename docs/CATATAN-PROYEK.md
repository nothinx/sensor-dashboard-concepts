# Catatan proyek

Ringkasan keputusan, status uji, dan catatan per proyek. Semua proyek berstatus **pratinjau konsep** untuk klien; catatan di bawah membedakan hal yang sengaja di luar cakupan pratinjau dari hal yang perlu ditindaklanjuti.

## Ruang lingkup

- Klien meminta 10 mockup dasbor pemantauan sensor; ditambah 5 konsep berbasis database cloud.
- Setiap proyek berdiri sendiri: website, database, cara menarik data, simulator, dan dokumentasi sendiri.
- Hasil akhir dipakai sebagai **pratinjau**: klien melihat dan memilih konsep. Backend Docker adalah demo teknis
  opsional untuk memperlihatkan arsitektur yang diusulkan.
- Belum ada data asli, logo, atau warna merek dari klien; semua ditandai placeholder.

## Keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 5 Nov 2026 | "10 mockup" berarti 10 proyek terpisah dengan gaya berbeda, bukan 10 layar satu sistem | klarifikasi user; draf 10 layar disimpan di `_draf-10-layar/` |
| 5 Nov 2026 | Database dan cara menarik data dibuat berbeda per proyek | user meminta variasi; klien bisa membandingkan pilihan arsitektur |
| 5 Nov 2026 | Arah desain memakai format lima baris unslop | membuat 15 tampilan benar-benar berbeda, bukan sekadar ganti warna |
| 5 Nov 2026 | Backend dijalankan sungguhan di Docker, dibangun paralel oleh beberapa agen | pilihan user; demo lebih meyakinkan |
| 5 Nov 2026 | Mode `?pratinjau` dan galeri `pratinjau.html` | pratinjau tanpa instalasi, tanpa pita galat koneksi |
| 5 Nov 2026 | Lima proyek cloud diuji dengan emulator resmi, tanpa akun cloud | tidak ada biaya dan tidak butuh akun; kode bisa dipindah ke cloud lewat `.env` |
| 5 Nov 2026 | Bahasa UI dan dokumen mengikuti EYD V (pukul 14.32, koma desimal) | permintaan user; diperiksa dengan skill naskah-id |
| 5 Nov 2026 | Semua proyek diposisikan sebagai pratinjau, bukan sistem produksi | arahan user |
| 5 Nov 2026 | Repo publik bernama umum `sensor-dashboard-concepts`; pratinjau statis dideploy ke Vercel | pilihan user; hanya folder `web/` yang diunggah |
| 5 Nov 2026 | Nama klien diganti nama netral di seluruh repo publik (`klien`, `konsep-NN`) | arahan user |

## Status uji

Semua stack diuji pada 5 November 2026 lalu dihentikan. Proyek 11 sampai 15 diuji dengan emulator lokal.

| No | Proyek | API diuji | Validasi masukan | Tampilan diperiksa | Catatan uji |
|---|---|---|---|---|---|
| 01 | Pusat Pemantauan Pabrik | ya | ya | ya | WebSocket dan akui alarm berjalan |
| 02 | Monitor Oven Reflow SMT | ya | ya | ya | task downsampling InfluxDB aktif |
| 03 | Pemantauan Energi Listrik | ya | ya | ya | ETag menghasilkan `304` |
| 04 | Perawatan Prediktif Getaran | ya | ya | ya | mutation perintah kerja tersimpan |
| 05 | Ruang Bersih & ESD | ya | ya | ya | SSE mengirim event |
| 06 | Gudang & Cold Storage | ya | ya | ya | ACL broker menolak publish anonim |
| 07 | NOC Perangkat & Gateway | ya | ya | ya | proxy menolak endpoint admin |
| 08 | Laporan Kepatuhan Mutu | ya | ya | ya | alur laporan PDF lengkap; jejak audit tak bisa diubah |
| 09 | Armada AC Pintar | ya | ya | ya | tabel inti tidak terekspos |
| 10 | IPAL & Emisi Lingkungan | ya | ya | ya | webhook dicoba ulang setelah gagal |
| 11 | Tugas Teknisi Lapangan | ya | ya (rules) | ya, HP dan desktop | 7 akses terlarang ditolak |
| 12 | Portal Mitra Servis | ya | ya (RLS) | ya | 9 cek RLS lulus |
| 13 | Genset & UPS Cabang | ya | ya | ya | paginasi 3 halaman |
| 14 | Uji Akhir Lini Kulkas | ya | ya | ya | change feed membentuk alarm |
| 15 | Jejak Mutu per Nomor Seri | ya | ya | ya | Atlas Search berjalan |

Pemeriksaan desain: sloplint 0 FAIL di ke-15 dasbor; kontras teks utama di atas 4,5:1. Hasil rinci dan
perintah uji ada di bagian "Pengujian dan verifikasi" README tiap proyek.

## Di luar cakupan pratinjau

Hal berikut tidak dikerjakan karena proyek berstatus pratinjau. Bila klien memilih satu konsep untuk dilanjutkan,
hal ini perlu dirancang:

- autentikasi dan otorisasi pengguna (kecuali 11 dan 12 yang memperagakannya dengan akun demo);
- koneksi ke sensor, PLC, atau sistem klien yang sebenarnya;
- backup, pemantauan layanan, pencatatan log terpusat, dan rencana skala;
- penerapan ke cloud asli untuk proyek 11 sampai 15 (langkahnya sudah ditulis di `docs/CLOUD.md`);
- data asli pengganti semua penanda `[REAL DATA]` (daftar lengkap: `KEBUTUHAN-DATA-KLIEN.md`).

## Catatan per proyek

| No | Catatan |
|---|---|
| 01 | Kode API dan simulator disalin ke image; perubahan kode butuh `up -d --build` |
| 02 | Sama seperti 01 |
| 03 | Tabel `pembacaan` di volume pernah dikosongkan saat pengembangan agar riwayat terisi ulang |
| 04 | Satu peringatan sloplint dibiarkan dengan sengaja (warna teks panel diwarisi) |
| 05, 06 | Folder `.shot/` sisa tangkapan layar uji sudah dihapus |
| 07 | Bila seri di Prometheus ganda, kosongkan volume dengan `docker compose -p konsep-07 down -v` lalu `up -d` |
| 08 | Volume berisi tiga laporan hasil uji; wajar sebagai contoh. Identitas penyusun diambil dari header `X-Aktor` |
| 09 | Kode galat AC dan model unit adalah contoh generik |
| 10 | API memakai server bawaan PHP; `openapi.yaml` belum divalidasi dengan parser |
| 11 | Tautan `?demo` masuk otomatis ke akun demo, hanya aktif di emulator. Ikon PWA masih sementara |
| 12 | Dijalankan dua langkah (Supabase CLI lalu compose). `web/config.js` berisi kunci demo publik Supabase lokal |
| 13 | Lambda memakai Node 22 (bukan 20) karena AWS SDK sudah memperingatkan versi lama |
| 14 | Berkas Bicep dan `az` untuk Azure belum pernah dijalankan; ditandai `[REAL DATA: verifikasi]` |
| 15 | API Python dengan pustaka standar dan pymongo |

Berkas `.env` di beberapa proyek hanya berisi kredensial uji lokal atau kunci emulator publik, dan sudah masuk
`.gitignore`.

## Catatan pengerjaan

- Tangkapan layar headless: pakai Chrome `--headless=new --timeout=7000`. Edge headless sering keluar sebelum
  menulis berkas, dan `--virtual-time-budget` macet di halaman SSE atau MQTT.
- Halaman yang butuh login atau menunggu fetch selesai difoto lewat skrip Chrome DevTools Protocol.
- Proyek cloud yang berat (12, 14) diuji bergantian supaya memori WSL 8 GB cukup.
- Repositori publik: https://github.com/nothinx/sensor-dashboard-concepts. Pratinjau online di Vercel: https://sensor-dashboard-concepts.vercel.app.
