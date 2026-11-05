-- Data awal contoh: area, sensor, dan batas. Ringkasan harian diisi oleh simulator.
SET app.aktor = 'migrasi awal';

INSERT INTO area (kode, nama, urutan) VALUES
  ('SMT-L1', 'SMT Line 1', 1),
  ('SMT-L2', 'SMT Line 2', 2),
  ('PRK-TV', 'Perakitan TV', 3),
  ('PRK-KL', 'Perakitan kulkas', 4),
  ('UTL', 'Kompresor & utilitas', 5),
  ('GDG', 'Gudang komponen', 6),
  ('CSB', 'Cold storage B', 7),
  ('SRV', 'Ruang server', 8);

INSERT INTO sensor (tag, area_id, besaran, satuan)
SELECT s.tag, a.id, s.besaran, s.satuan
FROM (VALUES
  ('TH-SMT1-01', 'SMT-L1', 'suhu', '°C'),
  ('TH-SMT1-02', 'SMT-L1', 'kelembapan', '%RH'),
  ('PC-L1', 'SMT-L1', 'partikel ≥ 0,5 µm', 'per m³'),
  ('TH-SMT2-01', 'SMT-L2', 'suhu', '°C'),
  ('TH-SMT2-02', 'SMT-L2', 'kelembapan', '%RH'),
  ('TH-TV-01', 'PRK-TV', 'suhu', '°C'),
  ('TH-TV-02', 'PRK-TV', 'kelembapan', '%RH'),
  ('TH-PK-01', 'PRK-KL', 'suhu', '°C'),
  ('VB-K02', 'UTL', 'getaran', 'mm/s'),
  ('PT-UDARA', 'UTL', 'tekanan udara tekan', 'bar'),
  ('TH-GD-01', 'GDG', 'suhu', '°C'),
  ('DC-01', 'GDG', 'kelembapan dry cabinet', '%RH'),
  ('TS-CSB-01', 'CSB', 'suhu', '°C'),
  ('TS-SRV-01', 'SRV', 'suhu', '°C')
) AS s (tag, kode, besaran, satuan)
JOIN area a ON a.kode = s.kode;

INSERT INTO batas (sensor_id, nilai_min, nilai_maks, berlaku_mulai)
SELECT se.id, b.mn, b.mx, DATE '2026-01-01'
FROM (VALUES
  ('TH-SMT1-01', 22, 26), ('TH-SMT1-02', 40, 60), ('PC-L1', NULL, 352000),
  ('TH-SMT2-01', 22, 26), ('TH-SMT2-02', 40, 60),
  ('TH-TV-01', 22, 28), ('TH-TV-02', 30, 65),
  ('TH-PK-01', 20, 30),
  ('VB-K02', NULL, 4.5), ('PT-UDARA', 6, 8),
  ('TH-GD-01', 18, 30), ('DC-01', NULL, 5),
  ('TS-CSB-01', 2, 10),
  ('TS-SRV-01', 18, 27)
) AS b (tag, mn, mx)
JOIN sensor se ON se.tag = b.tag;

RESET app.aktor;
