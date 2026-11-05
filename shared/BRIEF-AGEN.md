# Brief bersama 10 proyek dasbor pemantauan sensor

Berlaku untuk semua agen. Arah per proyek ada di tabel README induk (dibuat belakangan) dan di prompt agen.

## Struktur per proyek `NN-nama/`
```
NN-nama/
  README.md              ringkasan, arsitektur (diagram mermaid), cara menjalankan, port, uji, batasan
  docker-compose.yml     db + api + simulator (+ web bila perlu); nama proyek compose: konsep-NN
  .env.example           semua variabel (tanpa rahasia asli)
  web/index.html         dasbor (gaya sendiri) + web/style.css + web/app.js
  api/ ...               backend (bahasa sesuai tabel)
  simulator/ ...         pembangkit data sensor realistis yang menulis ke database/broker
  db/ ...                skema/migrasi/seed
  docs/API.md            (atau openapi.yaml / schema.graphql + API.md) endpoint, contoh request & response nyata
  docs/DATABASE.md       skema, diagram relasi (mermaid erDiagram) atau model data, indeks, retensi, ukuran perkiraan
  docs/DAFTAR-TITIK.md   point list: tag, nama, jenis sensor, satuan, rentang, interval, ambang peringatan/kritis, sumber
  docs/DESAIN.md         arah 5 baris (produk, karakter, dunia, momen, tanda tangan; format unslop, kredit Damir Sokolovsky CC BY 4.0), token warna & huruf, keputusan desain
```

## Aturan
- **Port**: proyek NN memakai 18NN0 sampai 18NN9 (01 → 18010-18019, 10 → 18100-18109). Dasbor dibuka di `http://localhost:18NN0`.
- **Frontend**: pakai `../shared/charts.js` dan `../shared/charts.css` TIDAK bisa lewat docker volume relatif dengan aman, jadi web disajikan dari folder proyek; salin kedua file itu ke `web/vendor/` dengan skrip/Makefile kecil atau mount `../shared` read-only di compose. Jangan ubah isi `shared/`.
- Dasbor menarik data dari API sesuai tabel. Bila API tidak terhubung (dibuka via `file://` atau stack mati), tampilkan data contoh bawaan + pita jelas "Mode data contoh: API tidak terhubung" (state galat dengan sebab + langkah). Ada state memuat.
- **Simulator**: data realistis dan deterministik secukupnya (siklus harian, derau, sesekali kejadian alarm), menulis tiap beberapa detik; isi riwayat 24 jam saat start pertama (backfill) supaya grafik langsung penuh.
- **Keamanan dasar**: kredensial lewat env, tidak di-hardcode di kode; validasi input di API; CORS hanya origin dasbor. Tanpa rahasia asli di repo.
- **Desain**: design-guide 3b + unslop (latar dasbor netral, warna hanya di momen, satu aksen, status ikon+teks, 4px grid, tanpa emoji/em dash/label kapital ber-tracking). Gaya tiap situs HARUS berbeda tegas (huruf, palet, tata letak, kepadatan). IBM Plex dilarang (dipakai draf lama). Stempel `/* Hallmark · ...` baris 1 CSS.
- **Bahasa**: Indonesia EYD V di UI dan dokumentasi (pukul 14.32, koma desimal, titik ribuan, kalimat tidak diawali angka). Kode, identifier, commit: konvensi teknis Inggris.
- **Fakta**: data sensor = contoh, ditandai. Regulasi/tarif/spesifikasi eksternal yang tak pasti → `[REAL DATA: ...]`.
- **Uji wajib**: `docker compose -p konsep-NN up -d --build`, cek API dengan curl, buka dasbor via Edge headless (screenshot), lalu `docker compose -p konsep-NN stop`. Jangan `down -v` (diblokir). Simpan bukti uji singkat di README bagian "Verifikasi".
- **Shell**: jangan pernah `python -` lewat heredoc; tambahkan `</dev/null` pada python/node/docker; tulis file lewat Write; jangan ketik ke pane herdr lain.
