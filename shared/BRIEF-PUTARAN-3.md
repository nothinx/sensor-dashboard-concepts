# Brief putaran 3: keterbacaan, bahasa, kerapian, kesan mahal

Putaran 2 sudah membuat 15 konsep punya dunia masing-masing. Pertahankan itu. Kritik klien putaran ini:
**huruf kurang nyaman dibaca, ukuran huruf tidak konsisten, tata letak berantakan, bahasa masih ada yang aneh,
dan belum terasa mahal.** Kerjakan ulang secara menyeluruh, bukan tambal sulam. Konsep, dunia, dan tanda
tangan di `docs/DESAIN.md` tetap kontrak; yang naik kelas adalah eksekusinya.

## Temuan dari render (contoh nyata, berlaku di banyak proyek)

- **Tracking negatif pada teks kecil** membuat kata menempel ("1baru, 1dijadwalkan", "Diperbaruipukul").
  Letter-spacing negatif hanya untuk ≥ 28 px dan maksimal -0.02em. Teks < 20 px: 0 atau sedikit positif.
- **Mono dipakai berlebihan**: durasi "1 j 10 m" dalam mono lebar, judul tiket, label sumbu, cap waktu, dan
  angka dalam kalimat. Mono hanya untuk kode/ID (nomor seri, tag, ID tiket) bila dunianya memang menuntut.
  Angka pakai font sans proyek dengan `font-variant-numeric: tabular-nums` (dan `lining-nums`). Satuan lebih
  kecil dan lebih ringan dari angkanya, dipisah spasi tipis (`&thinsp;`), tidak ikut ukuran raksasa.
- **Skala tipe liar**: ukuran px ditulis langsung di banyak selektor. Tetapkan **satu skala tipe di `:root`**
  (maksimal 7 langkah, rasio konsisten, mis. 13 / 15 / 17 / 20 / 28 / 40 / 64 untuk layar meja 1920, atau
  skala jarak jauh untuk layar dinding) dan pakai hanya token itu. `grep -E "font-size: *[0-9]"` di style.css
  harus kosong kecuali di `:root`. Isi ≥ 15 px di layar desktop, label ≥ 13 px, chip ≥ 13 px.
- **Ritme vertikal**: line-height isi 1.5, judul 1.15 sampai 1.25, angka besar 1.0. Paragraf maksimal 65ch.
  Jarak pakai kelipatan 4/8 px dari token `--sp-*`; tepi kiri semua blok sejajar pada satu kisi.
- **Komponen tidak seragam**: tinggi tombol, padding kartu, radius, ketebalan garis berbeda antarbagian.
  Satu radius (atau dua: kecil & besar), satu tebal garis, satu bayangan halus bila dunia memakainya.
- **Bahasa**: istilah tidak baku atau janggal ("hisap" → "isap", "galat" untuk pengguna awam → "kode
  gangguan"/"error" sesuai pengguna, "Offline" campur Inggris di kalimat Indonesia, singkatan "j"/"m"/"mnt"
  yang tidak lazim di UI). Tulis seperti tim produk Indonesia yang rapi menulis untuk penggunanya: kalimat
  aktif, pendek, satu istilah per konsep di seluruh situs, sentence case, EYD V (pukul 14.32, 1,5 PK,
  6 Nov 2026). Istilah teknis yang memang dipakai di lapangan (SLA, UPS, PK, ESD, reflow) boleh. Periksa
  **semua** teks: header, label, chip, tooltip, pesan kosong/galat, `title`, `aria-label`, teks di `app.js`
  dan data contoh.

## Arah "mahal"

Mahal = disiplin, bukan hiasan. Rujukan (dari pengetahuanmu, tanpa menyalin aset): Linear, Stripe Dashboard,
Vercel Geist, Apple Home/Health, kit Figma Community yang dikenal rapi (Untitled UI, Tremor, Catalyst),
Carbon / ISA-101 untuk konsep industri, desain editorial FT / Monocle untuk konsep kertas. Ambil prinsipnya:

1. Lebih sedikit warna, lebih banyak nada netral yang dikalibrasi; aksen dipakai hemat dan bermakna.
2. Ruang napas besar dan konsisten; kepadatan dari kisi, bukan dari menjejalkan.
3. Hierarki tipe tegas: satu hal terbesar per layar, kontras berat 400/500/600 (hindari 700+ pada huruf kecil).
4. Detail halus yang konsisten: garis 1 px tenang, sudut seragam, ikon satu gaya garis, status rapi.
5. Angka diperlakukan sebagai tipografi: rata kanan di tabel, tabular, satuan diredam.
6. Tak ada elemen terpotong, tumpang tindih, atau baris yatim satu kata di judul (`text-wrap: balance`,
   `text-wrap: pretty` untuk paragraf).

Font: boleh ganti ke font Google lain bila font sekarang kurang nyaman (dilarang IBM Plex, Inter polos,
Roboto, Arial sebagai pilihan utama). Pilih font dengan x-height yang lega dan tabular figures yang baik.
Muat hanya bobot yang dipakai. Catat alasannya di tabel Keputusan DESAIN.md.

## Batas kerja (sama dengan putaran 2)

- Hanya ubah `NN-*/web/` dan `NN-*/docs/DESAIN.md` proyekmu. Jangan ubah `shared/`, `api/`, `simulator/`,
  `db/`, atau proyek lain. `shared/charts.css` kini membaca `--chart-font`, `--chart-fs`, `--tip-fs`,
  `--st-fs` (bawaan font mono, 13 px): set di `:root` proyekmu.
- Jaga semua wiring data di `app.js` (fetch, WebSocket, SSE, MQTT, GraphQL, SDK cloud, `TANPA_API`,
  `PRATINJAU`, penanda tunggal `data-pratinjau`). Boleh ubah teks dan markup yang dihasilkan JS.
- Floor design-guide: kontras diukur (`python C:/Users/HP/.agents/skills/design-guide/scripts/contrast-check.py "#fg" "#bg"`),
  status ikon + teks, fokus terlihat, `prefers-reduced-motion`, tanpa em/en dash sebagai pisah, tanpa emoji,
  tanpa label kapital ber-tracking, data tak pasti `[REAL DATA: ...]`, tanpa mengarang fakta.

## Verifikasi (wajib, dari render nyata)

Render dengan Chrome headless (keluar sendiri; **jangan** menulis skrip CDP/puppeteer yang menyalakan Chrome):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars `
  --user-data-dir="<scratchpad>\prof-NN" --window-size=1920,1080 --virtual-time-budget=4000 --timeout=15000 `
  "--screenshot=<scratchpad>\NN-1920.png" "file:///<folder-repo>/NN-nama/web/index.html?pratinjau"
```

Ulangi di 1440×900 dan 390×844. Lihat gambarnya dengan Read, perbaiki, render lagi (maks tiga putaran).
Lalu: `node C:/Users/HP/.agents/skills/design-guide/scripts/sloplint/sloplint.mjs NN-nama/web` = 0 FAIL,
`node --check` untuk tiap .js yang diubah. Hapus folder `prof-NN` setelah selesai.
