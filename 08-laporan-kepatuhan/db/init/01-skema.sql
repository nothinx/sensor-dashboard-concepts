-- Skema basis data Laporan Kepatuhan Mutu (PostgreSQL 16).
-- Dijalankan otomatis oleh image postgres saat volume data masih kosong.

CREATE TABLE area (
  id      smallserial PRIMARY KEY,
  kode    text NOT NULL UNIQUE CHECK (kode ~ '^[A-Z0-9-]{2,16}$'),
  nama    text NOT NULL,
  urutan  smallint NOT NULL
);

CREATE TABLE sensor (
  id       serial PRIMARY KEY,
  tag      text NOT NULL UNIQUE,
  area_id  smallint NOT NULL REFERENCES area (id),
  besaran  text NOT NULL,
  satuan   text NOT NULL
);
CREATE INDEX sensor_area ON sensor (area_id);

-- Batas syarat per sensor; riwayat perubahan disimpan sebagai baris baru (berlaku_mulai).
CREATE TABLE batas (
  id             serial PRIMARY KEY,
  sensor_id      int NOT NULL REFERENCES sensor (id),
  nilai_min      numeric,
  nilai_maks     numeric,
  berlaku_mulai  date NOT NULL,
  CHECK (nilai_min IS NOT NULL OR nilai_maks IS NOT NULL),
  CHECK (nilai_min IS NULL OR nilai_maks IS NULL OR nilai_min < nilai_maks),
  UNIQUE (sensor_id, berlaku_mulai)
);

-- Agregat harian per area: berapa detik terpantau dan berapa detik semua sensor area dalam batas.
CREATE TABLE ringkasan_harian (
  area_id       smallint NOT NULL REFERENCES area (id),
  tanggal       date NOT NULL,
  detik_total   int NOT NULL DEFAULT 0 CHECK (detik_total BETWEEN 0 AND 86400),
  detik_sesuai  int NOT NULL DEFAULT 0 CHECK (detik_sesuai BETWEEN 0 AND detik_total),
  PRIMARY KEY (area_id, tanggal)
);
CREATE INDEX ringkasan_tanggal ON ringkasan_harian (tanggal);

CREATE SEQUENCE laporan_nomor_seq;

CREATE TABLE laporan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor         text NOT NULL UNIQUE,
  jenis         text NOT NULL CHECK (jenis IN ('kepatuhan', 'jejak_audit')),
  area_id       smallint REFERENCES area (id),
  dari          date NOT NULL,
  sampai        date NOT NULL CHECK (sampai >= dari),
  format        text NOT NULL CHECK (format IN ('csv', 'pdf')),
  status        text NOT NULL DEFAULT 'antri' CHECK (status IN ('antri', 'proses', 'selesai', 'gagal')),
  progres       smallint NOT NULL DEFAULT 0 CHECK (progres BETWEEN 0 AND 100),
  pesan_galat   text,
  dibuat_oleh   text NOT NULL,
  dibuat_pada   timestamptz NOT NULL DEFAULT now(),
  selesai_pada  timestamptz,
  nama_berkas   text,
  berkas        bytea
);
CREATE INDEX laporan_urut ON laporan (dibuat_pada DESC, id DESC);

-- Jejak audit append-only. Aktor diambil dari setting transaksi app.aktor yang diisi API.
CREATE TABLE jejak_audit (
  id         bigserial PRIMARY KEY,
  waktu      timestamptz NOT NULL DEFAULT now(),
  aktor      text NOT NULL,
  aksi       text NOT NULL CHECK (aksi IN ('INSERT', 'UPDATE', 'DELETE')),
  tabel      text NOT NULL,
  rekaman    text NOT NULL,
  perubahan  jsonb NOT NULL
);
CREATE INDEX jejak_audit_waktu ON jejak_audit (waktu);

CREATE FUNCTION catat_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  data jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    data := to_jsonb(OLD) - 'berkas';
  ELSIF TG_OP = 'INSERT' THEN
    data := to_jsonb(NEW) - 'berkas';
  ELSE
    -- hanya kolom yang berubah
    SELECT jsonb_object_agg(n.key, n.value) INTO data
    FROM jsonb_each(to_jsonb(NEW) - 'berkas') n
    WHERE (to_jsonb(OLD) -> n.key) IS DISTINCT FROM n.value;
    IF data IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;
  INSERT INTO jejak_audit (aktor, aksi, tabel, rekaman, perubahan)
  VALUES (
    coalesce(nullif(current_setting('app.aktor', true), ''), current_user),
    TG_OP, TG_TABLE_NAME,
    coalesce(to_jsonb(NEW) ->> 'nomor', to_jsonb(OLD) ->> 'nomor', to_jsonb(NEW) ->> 'id', to_jsonb(OLD) ->> 'id'),
    data
  );
  RETURN coalesce(NEW, OLD);
END $$;

-- Perubahan progres tidak diaudit; hanya pembuatan, perubahan status, dan penghapusan.
CREATE TRIGGER laporan_audit AFTER INSERT OR DELETE OR UPDATE OF status ON laporan
  FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER batas_audit AFTER INSERT OR UPDATE OR DELETE ON batas
  FOR EACH ROW EXECUTE FUNCTION catat_audit();

CREATE FUNCTION tolak_ubah_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'jejak_audit hanya boleh ditambah (append-only)';
END $$;

CREATE TRIGGER jejak_audit_append_only BEFORE UPDATE OR DELETE ON jejak_audit
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah_audit();
CREATE TRIGGER jejak_audit_tanpa_truncate BEFORE TRUNCATE ON jejak_audit
  FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah_audit();
