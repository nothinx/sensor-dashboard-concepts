-- Skema SQLite proyek 03 · Pemantauan Energi Listrik
-- Dijalankan idempoten oleh api dan simulator saat start (CREATE ... IF NOT EXISTS, INSERT OR IGNORE).
-- Waktu disimpan sebagai detik epoch UTC; tampilan memakai WIB (UTC+7).

CREATE TABLE IF NOT EXISTS konfigurasi (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS panel (
  id      TEXT PRIMARY KEY,                  -- kode panel, mis. SDP-SMT
  nama    TEXT NOT NULL,
  area    TEXT NOT NULL,                     -- area beban yang dilayani
  jenis   TEXT NOT NULL CHECK (jenis IN ('utama', 'sub')),
  urutan  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meter (
  id          TEXT PRIMARY KEY,              -- tag power meter, mis. PM-SMT
  panel_id    TEXT NOT NULL UNIQUE REFERENCES panel(id),
  merek_model TEXT,                          -- diisi dari data klien
  protokol    TEXT NOT NULL DEFAULT 'Modbus TCP',
  alamat      TEXT,                          -- IP dan unit id, diisi dari data klien
  rasio_ct    TEXT
);

-- Satu baris per meter per interval 15 menit yang sudah lengkap.
CREATE TABLE IF NOT EXISTS pembacaan (
  meter_id TEXT NOT NULL REFERENCES meter(id),
  ts       INTEGER NOT NULL,                 -- awal interval, epoch UTC, kelipatan 900
  kwh      REAL NOT NULL CHECK (kwh >= 0),   -- energi aktif selama interval
  kw_rata  REAL NOT NULL,                    -- daya aktif rata-rata
  kw_maks  REAL NOT NULL,                    -- daya aktif maksimum (demand) dalam interval
  pf_rata  REAL NOT NULL CHECK (pf_rata BETWEEN 0 AND 1),
  PRIMARY KEY (meter_id, ts)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ix_pembacaan_ts ON pembacaan (ts);

-- Nilai sesaat terakhir per meter (ditimpa setiap siklus baca).
CREATE TABLE IF NOT EXISTS sesaat (
  meter_id TEXT PRIMARY KEY REFERENCES meter(id),
  ts       INTEGER NOT NULL,
  kw       REAL NOT NULL,
  v_r REAL NOT NULL, v_s REAL NOT NULL, v_t REAL NOT NULL,   -- tegangan fasa-netral, V
  i_r REAL NOT NULL, i_s REAL NOT NULL, i_t REAL NOT NULL,   -- arus fasa, A
  pf       REAL NOT NULL,
  thd_i    REAL NOT NULL                                     -- distorsi harmonik total arus, %
);

INSERT OR IGNORE INTO konfigurasi (kunci, nilai) VALUES
  ('batas_kontrak_kw', '1600'),
  ('pf_min', '0.85'),
  ('ketidakseimbangan_maks_persen', '10'),
  ('thd_i_maks_persen', '15');

INSERT OR IGNORE INTO panel (id, nama, area, jenis, urutan) VALUES
  ('MDP',      'Panel utama (MDP)', 'Seluruh pabrik',         'utama', 0),
  ('SDP-SMT',  'SDP SMT',           'Oven reflow (2 lini)',   'sub',   1),
  ('SDP-KMP',  'SDP Kompresor',     'Kompresor & utilitas',   'sub',   2),
  ('SDP-HVAC', 'SDP HVAC',          'HVAC produksi',          'sub',   3),
  ('SDP-TV',   'SDP Perakitan TV',  'Perakitan TV',           'sub',   4),
  ('SDP-KLK',  'SDP Perakitan kulkas', 'Perakitan kulkas',    'sub',   5),
  ('SDP-GDG',  'SDP Gudang',        'Gudang & cold storage',  'sub',   6),
  ('SDP-KTR',  'SDP Kantor',        'Kantor & lain-lain',     'sub',   7);

INSERT OR IGNORE INTO meter (id, panel_id) VALUES
  ('PM-MDP', 'MDP'), ('PM-SMT', 'SDP-SMT'), ('PM-KMP', 'SDP-KMP'), ('PM-HVAC', 'SDP-HVAC'),
  ('PM-TV', 'SDP-TV'), ('PM-KLK', 'SDP-KLK'), ('PM-GDG', 'SDP-GDG'), ('PM-KTR', 'SDP-KTR');
