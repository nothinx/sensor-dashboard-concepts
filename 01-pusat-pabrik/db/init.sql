-- Skema proyek 01: TimescaleDB. Dijalankan otomatis sekali oleh image timescale saat volume kosong.
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE area (
  id   text PRIMARY KEY,
  name text NOT NULL,
  sort int  NOT NULL
);

CREATE TABLE sensor (
  id      text PRIMARY KEY,
  area_id text NOT NULL REFERENCES area(id),
  name    text NOT NULL,
  kind    text NOT NULL,          -- room_temp, rh, oven_temp, vibration, pressure, cold_temp, door_open, power
  unit    text NOT NULL,
  warn_lo double precision,       -- NULL = tidak ada batas di sisi itu
  warn_hi double precision,
  crit_lo double precision,
  crit_hi double precision,
  CHECK (warn_hi IS NULL OR crit_hi IS NULL OR warn_hi <= crit_hi),
  CHECK (warn_lo IS NULL OR crit_lo IS NULL OR warn_lo >= crit_lo)
);

-- Data mentah: satu baris per pembacaan. Hypertable dipartisi per hari.
CREATE TABLE reading (
  time      timestamptz      NOT NULL,
  sensor_id text             NOT NULL REFERENCES sensor(id),
  value     double precision NOT NULL
);
SELECT create_hypertable('reading', by_range('time', INTERVAL '1 day'));
CREATE INDEX reading_sensor_time ON reading (sensor_id, time DESC);
SELECT add_retention_policy('reading', INTERVAL '30 days');

-- Agregat 15 menit untuk pita status dan grafik 24 jam.
-- materialized_only = false: ember terbaru yang belum dimaterialisasi tetap dihitung langsung.
CREATE MATERIALIZED VIEW reading_15m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('15 minutes', time) AS bucket,
       sensor_id,
       avg(value) AS avg,
       min(value) AS min,
       max(value) AS max,
       count(*)   AS n
FROM reading
GROUP BY bucket, sensor_id
WITH NO DATA;
SELECT add_continuous_aggregate_policy('reading_15m',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '15 minutes',
  schedule_interval => INTERVAL '5 minutes');
SELECT add_retention_policy('reading_15m', INTERVAL '400 days');

CREATE TABLE alarm (
  id         bigserial PRIMARY KEY,
  sensor_id  text        NOT NULL REFERENCES sensor(id),
  level      smallint    NOT NULL CHECK (level IN (1, 2)),   -- 1 peringatan, 2 kritis
  started_at timestamptz NOT NULL,
  ended_at   timestamptz,
  acked_at   timestamptz,
  peak       double precision NOT NULL
);
-- Paling banyak satu alarm terbuka per sensor.
CREATE UNIQUE INDEX alarm_one_open ON alarm (sensor_id) WHERE ended_at IS NULL;
CREATE INDEX alarm_started ON alarm (started_at DESC);

-- Data contoh: area dan titik sensor (lihat docs/DAFTAR-TITIK.md).
INSERT INTO area (id, name, sort) VALUES
  ('smt1',   'SMT Line 1',           1),
  ('smt2',   'SMT Line 2',           2),
  ('tv',     'Perakitan TV',         3),
  ('kulkas', 'Perakitan kulkas',     4),
  ('util',   'Kompresor & utilitas', 5),
  ('gudang', 'Gudang komponen',      6),
  ('csb',    'Cold storage B',       7),
  ('qc',     'Uji akhir (QC)',       8),
  ('panel',  'Panel listrik utama',  9),
  ('server', 'Ruang server',        10);

INSERT INTO sensor (id, area_id, name, kind, unit, warn_lo, warn_hi, crit_lo, crit_hi) VALUES
  ('TH-SMT1-T', 'smt1',   'Suhu ruang SMT Line 1',        'room_temp', '°C',  20,   26,   18,   28),
  ('TH-SMT1-H', 'smt1',   'Kelembapan ruang SMT Line 1',  'rh',        '%RH', 40,   60,   35,   65),
  ('TC-L1-Z6',  'smt1',   'Suhu oven zona 6 Line 1',      'oven_temp', '°C',  240,  248,  235,  250),
  ('TH-SMT2-T', 'smt2',   'Suhu ruang SMT Line 2',        'room_temp', '°C',  20,   26,   18,   28),
  ('TH-SMT2-H', 'smt2',   'Kelembapan ruang SMT Line 2',  'rh',        '%RH', 40,   60,   35,   65),
  ('TC-L2-Z6',  'smt2',   'Suhu oven zona 6 Line 2',      'oven_temp', '°C',  240,  248,  235,  250),
  ('TH-TV-T',   'tv',     'Suhu ruang perakitan TV',      'room_temp', '°C',  20,   27,   18,   29),
  ('TH-PK-T',   'kulkas', 'Suhu ruang perakitan kulkas',  'room_temp', '°C',  20,   28,   18,   30),
  ('VB-K02',    'util',   'Getaran kompresor K-02',       'vibration', 'mm/s', NULL, 4.5, NULL, 7.1),
  ('PT-UDARA',  'util',   'Tekanan udara tekan',          'pressure',  'bar', 6.0,  NULL, 5.5,  NULL),
  ('TH-GD-T',   'gudang', 'Suhu gudang komponen',         'room_temp', '°C',  18,   30,   15,   32),
  ('TH-GD-08',  'gudang', 'Kelembapan gudang komponen',   'rh',        '%RH', 30,   60,   20,   70),
  ('TS-CSB',    'csb',    'Suhu cold storage B',          'cold_temp', '°C',  2,    8,    0,    10),
  ('DS-CSB',    'csb',    'Pintu cold storage B terbuka', 'door_open', 'mnt', NULL, 5,    NULL, 15),
  ('TH-QC-T',   'qc',     'Suhu ruang uji akhir',         'room_temp', '°C',  20,   26,   18,   28),
  ('PM-MDP',    'panel',  'Beban listrik MDP',            'power',     'kW',  NULL, 1500, NULL, 1600),
  ('TH-SRV-T',  'server', 'Suhu ruang server',            'room_temp', '°C',  18,   27,   15,   30);
