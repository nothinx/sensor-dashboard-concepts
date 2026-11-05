-- Data acuan contoh. Nilai baku mutu di bawah ADALAH CONTOH untuk mockup;
-- ganti dengan baku mutu yang tercantum di izin pembuangan air limbah klien. [REAL DATA: baku mutu sesuai izin]

insert into titik (kode, nama, tahap, urutan, wajib_baku_mutu) values
  ('S1', 'Inlet IPAL', 'Air limbah masuk (influen)', 1, false),
  ('S2', 'Setelah koagulasi', 'Koagulasi dan flokulasi', 2, false),
  ('S3', 'Setelah aerasi', 'Pengolahan biologis', 3, false),
  ('S4', 'Outlet IPAL', 'Titik buang ke badan air (efluen)', 4, true);

insert into parameter (kode, nama, satuan, bm_min, bm_maks, desimal, keterangan) values
  ('ph',    'pH',              '',       6.000, 9.000,  1, 'Contoh baku mutu; ganti sesuai izin'),
  ('cod',   'COD',             'mg/L',   null,  100.000, 0, 'Contoh baku mutu; ganti sesuai izin'),
  ('tss',   'TSS',             'mg/L',   null,  100.000, 0, 'Contoh baku mutu; ganti sesuai izin'),
  ('nh3n',  'Amonia (NH3-N)',  'mg/L',   null,  5.000,  1, 'Contoh baku mutu; ganti sesuai izin'),
  ('debit', 'Debit',           'm³/jam', null,  null,   1, 'Dicatat untuk menghitung beban pencemaran'),
  ('suhu',  'Suhu',            '°C',     null,  null,   1, 'Dipantau, tanpa baku mutu di mockup');

-- Hasil uji laboratorium (contoh), dibandingkan dengan pembacaan sensor online.
insert into hasil_lab (titik, parameter, tanggal_sampling, nilai, lab, catatan) values
  ('S4', 'cod',  current_date - interval 28 day, 61, '[REAL DATA: laboratorium terakreditasi]', 'Sampel sesaat'),
  ('S4', 'tss',  current_date - interval 28 day, 27, '[REAL DATA: laboratorium terakreditasi]', 'Sampel sesaat'),
  ('S4', 'nh3n', current_date - interval 28 day, 2.1, '[REAL DATA: laboratorium terakreditasi]', 'Sampel sesaat'),
  ('S4', 'ph',   current_date - interval 28 day, 7.3, '[REAL DATA: laboratorium terakreditasi]', 'Sampel sesaat'),
  ('S4', 'cod',  current_date - interval 7 day, 58, 'Laboratorium internal', 'Verifikasi sensor online'),
  ('S4', 'nh3n', current_date - interval 7 day, 2.6, 'Laboratorium internal', 'Verifikasi sensor online');
