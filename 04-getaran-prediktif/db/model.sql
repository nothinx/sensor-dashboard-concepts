-- Model data DuckDB proyek 04 · Perawatan Prediktif Getaran
-- API membuat view ini di koneksi DuckDB in-memory. {DATA} dan {MESIN_CSV} diganti saat start.
-- Sumber kebenaran ada di file (CSV master mesin + Parquet harian), DuckDB hanya mesin kueri.

CREATE OR REPLACE VIEW mesin AS
SELECT * FROM read_csv('{MESIN_CSV}', header = true, auto_detect = true);

CREATE OR REPLACE VIEW rms AS
SELECT * FROM read_parquet('{DATA}/rms/*.parquet');

CREATE OR REPLACE VIEW spektrum AS
SELECT * FROM read_parquet('{DATA}/spektrum/*.parquet');

CREATE OR REPLACE VIEW perintah_kerja AS
SELECT * FROM read_parquet('{DATA}/perintah_kerja/*.parquet', union_by_name = true);

-- Ringkasan RMS harian (tanggal menurut WIB, UTC+7)
CREATE OR REPLACE VIEW rms_harian AS
SELECT mesin_id,
       CAST(diukur_pada + INTERVAL 7 HOUR AS DATE) AS tanggal,
       avg(rms_mm_s)  AS rms_mm_s,
       max(suhu_c)    AS suhu_maks_c,
       count(*)       AS jumlah_ukur
FROM rms
GROUP BY ALL;

-- Pengukuran terakhir per mesin
CREATE OR REPLACE VIEW rms_terakhir AS
SELECT * FROM rms
QUALIFY row_number() OVER (PARTITION BY mesin_id ORDER BY diukur_pada DESC) = 1;
