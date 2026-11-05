# Kebutuhan data dari klien

Daftar ini dihasilkan otomatis oleh `shared/alat/kumpulkan_real_data.py` dari penanda `[REAL DATA: ...]`
di semua proyek. Jangan disunting manual; perbarui penandanya di proyek lalu jalankan ulang skrip.

Total 65 butir di 15 proyek. Butir yang sama di beberapa proyek cukup diminta sekali.

## Semua proyek

| Data yang dibutuhkan | Dipakai di |
|---|---|
| Logo perusahaan (SVG) | slot `[LOGO KLIEN]` di kepala setiap dasbor |
| Warna merek resmi | token aksen di `web/style.css` tiap proyek |
| Nama produk/sistem yang dipakai klien | judul dasbor dan `<title>` |
| Proyek mana yang dilanjutkan | menentukan data sensor asli yang perlu dihubungkan |

## 01-pusat-pabrik

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| point list pabrik | `docs/DAFTAR-TITIK.md` |
| daya kontrak PLN | `docs/DAFTAR-TITIK.md` |
| jadwal shift pabrik | `README.md` |

## 02-oven-reflow

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| nama resep Line 1 | `api/main.py` |
| nama resep Line 2 | `api/main.py` |
| lembar data pasta solder klien | `docs/DAFTAR-TITIK.md` |

## 03-energi-listrik

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| IP / unit id | `docs/DAFTAR-TITIK.md` |
| batas tegangan klien | `docs/DAFTAR-TITIK.md` |
| dari kontrak PLN klien | `docs/DATABASE.md` |
| tarif | `docs/DESAIN.md` |
| tarif LWBP/WBP | `web/index.html` |

## 04-getaran-prediktif

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| batas pabrikan | `docs/DAFTAR-TITIK.md` |
| sistem CMMS | `README.md` |
| dari CMMS klien | `web/index.html` |

## 05-ruang-bersih-esd

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| kelas ruang bersih, ambang lingkungan, prosedur ESD | `docs/DAFTAR-TITIK.md` |
| kelas ruang bersih, ambang ESD, prosedur uji gelang | `README.md` |

## 06-cold-storage

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| rentang simpan dari lembar data pasta solder/lem dan prosedur MSD klien | `docs/DAFTAR-TITIK.md` |
| rentang simpan dari lembar data material dan prosedur MSD klien | `README.md` |

## 07-noc-perangkat

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| SOP pemeliharaan klien | `docs/DAFTAR-TITIK.md` |
| kebijakan akses jaringan OT klien | `README.md` |

## 08-laporan-kepatuhan

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| aturan penomoran dokumen mutu klien | `docs/API.md` |
| spesifikasi lingkungan per area | `docs/DAFTAR-TITIK.md` |
| masa simpan rekaman mutu klien | `docs/DATABASE.md` |
| kebijakan backup klien | `docs/DATABASE.md` |
| penyedia identitas klien | `README.md` |
| nama dan paraf | `web/index.html` |

## 09-ac-pintar

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| kode model resmi | `db/01-skema.sql` |
| tabel kode galat resmi | `db/02-seed.sql` |
| interval kirim modul | `docs/DAFTAR-TITIK.md` |
| spesifikasi teknis per model | `docs/DAFTAR-TITIK.md` |

## 10-ipal-lingkungan

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| baku mutu sesuai izin | `db/02-seed.sql` |
| laboratorium terakreditasi | `db/02-seed.sql` |
| spesifikasi sistem pelaporan lingkungan | `docs/API.md` |
| data operasi IPAL | `docs/DAFTAR-TITIK.md` |
| baku mutu sesuai izin pembuangan air limbah | `web/index.html` |

## 11-firebase-teknisi

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| penyedia identitas klien | `docs/CLOUD.md` |
| ambang resmi dan spesifikasi mesin | `docs/DAFTAR-TITIK.md` |
| jumlah mesin dan interval | `docs/DATABASE.md` |
| aset ikon | `docs/DESAIN.md` |
| formulir masuk akun perusahaan | `web/app.js` |

## 12-supabase-mitra

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| region yang dipilih klien | `docs/CLOUD.md` |
| antarmuka CRM/call center klien | `docs/CLOUD.md` |
| cek harga terbaru di situs penyedia | `docs/CLOUD.md` |
| kontrak kemitraan servis dan SOP purnajual | `docs/DAFTAR-TITIK.md` |
| format nomor seri | `docs/DAFTAR-TITIK.md` |
| kebijakan arsip layanan purnajual | `docs/DATABASE.md` |
| dari kontrak kemitraan servis | `README.md` |
| integrasi call center/CRM | `supabase/migrations/20261105000100_simulator.sql` |

## 13-aws-genset-ups

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| penyedia identitas klien | `docs/CLOUD.md` |
| ambang resmi klien dan spesifikasi genset/UPS tiap cabang | `docs/DAFTAR-TITIK.md` |
| kebutuhan retensi klien | `docs/DATABASE.md` |
| mekanisme login klien, mis. JWT authorizer Amazon Cognito atau SSO perusahaan | `template.yaml` |

## 14-azure-uji-kulkas

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| spesifikasi uji akhir | `common/aturan.py` |
| cek harga terbaru di kalkulator harga Azure untuk region dan volume klien | `docs/CLOUD.md` |
| spesifikasi uji akhir dan ambang resmi dari dokumen mutu klien | `docs/DAFTAR-TITIK.md` |

## 15-atlas-jejak-mutu

| Data yang dibutuhkan | Lokasi pertama |
|---|---|
| pilih sesuai volume dan anggaran | `docs/CLOUD.md` |
| antarmuka sistem MES klien | `docs/CLOUD.md` |
| cek harga terbaru di situs penyedia | `docs/CLOUD.md` |
| dari prosedur QC dan sistem MES klien | `docs/DAFTAR-TITIK.md` |
| per model | `docs/DAFTAR-TITIK.md` |
| sesuai standar keselamatan yang dipakai klien | `docs/DAFTAR-TITIK.md` |
| uji analyzer bahasa Indonesia di Atlas | `docs/DATABASE.md` |
| masa garansi produk | `docs/DATABASE.md` |
| unit per hari per lini | `docs/DATABASE.md` |
| dari sistem QC klien | `README.md` |
