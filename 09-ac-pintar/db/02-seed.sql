-- Data contoh: 6 kota, 240 unit, kode galat generik, tiket servis.
-- Semua isi adalah DATA CONTOH untuk mockup; ganti dari sistem purnajual klien.

insert into armada.kota (id, nama) values
  (1, 'Jakarta'), (2, 'Surabaya'), (3, 'Bandung'), (4, 'Semarang'), (5, 'Medan'), (6, 'Makassar');

-- Kode galat generik (BUKAN tabel resmi pabrikan). [REAL DATA: tabel kode galat resmi]
insert into armada.kode_galat (kode, arti, tindakan) values
  ('E1', 'Sensor suhu ruang terbuka atau korsleting', 'Periksa konektor sensor ruang, ganti sensor bila perlu'),
  ('E5', 'Arus kompresor melebihi batas', 'Bersihkan kondensor, periksa kapasitor dan tegangan suplai'),
  ('P2', 'Tekanan hisap rendah', 'Periksa kebocoran pipa, isi ulang refrigeran sesuai spesifikasi'),
  ('F0', 'Unit tidak mengirim data', 'Periksa modul Wi-Fi dan jaringan pelanggan');

-- 240 unit; profil simulator ditentukan deterministik dari nomor urut
insert into armada.unit (id, kota_id, pelanggan_ref, model, kapasitas_pk, pola_pakai, suhu_set, profil_sim, dipasang)
select
  'AC-' || (array['JKT','SBY','BDG','SMG','MDN','MKS'])[k] || '-' || lpad(i::text, 4, '0'),
  k,
  'PLG-' || upper(substr(md5('plg' || i), 1, 6)),
  (array['Split dinding 0,5 PK', 'Split dinding 1 PK', 'Split dinding 1,5 PK', 'Split dinding 2 PK'])[1 + i % 4],
  (array[0.5, 1, 1.5, 2])[1 + i % 4],
  case when i % 3 = 0 then 'kantor' else 'rumah' end,
  (array[24, 25, 25, 26, 23])[1 + i % 5],
  case
    when i % 61 = 0 then 'offline'
    when i % 53 = 0 then 'sensor'
    when i % 41 = 0 then 'kondensor'
    when i % 37 = 0 then 'freon'
    else 'normal'
  end,
  date '2024-01-01' + (i * 3)
from generate_series(1, 240) as i,
     lateral (select 1 + i % 6 as k) as kk;

-- Tiket: riwayat selesai + tiket terbuka untuk sebagian unit bermasalah
insert into armada.tiket (unit_id, dibuat, status, masalah, peran_teknisi, jadwal, selesai)
select id, now() - interval '20 days' - (row_number() over () || ' hours')::interval, 'selesai',
       'Servis berkala dan cuci unit', 'Teknisi mitra area', null, now() - interval '19 days'
from armada.unit where profil_sim = 'normal' and kota_id in (1, 2) limit 12;

insert into armada.tiket (unit_id, dibuat, status, masalah, peran_teknisi, jadwal)
select id, now() - interval '5 hours', 'dijadwalkan',
       'Pendinginan lemah, tekanan hisap turun', 'Teknisi mitra area', date_trunc('day', now()) + interval '1 day 9 hours'
from armada.unit where profil_sim = 'freon' order by id limit 2;

insert into armada.tiket (unit_id, dibuat, status, masalah)
select id, now() - interval '50 minutes', 'baru', 'Kode galat E1 dari unit'
from armada.unit where profil_sim = 'sensor' order by id limit 1;
