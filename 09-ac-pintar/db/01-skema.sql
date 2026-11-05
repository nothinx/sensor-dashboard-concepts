-- Skema inti armada AC pintar (schema "armada"). Tidak terekspos ke API; API hanya melihat schema "api".
-- Data pelanggan disamarkan: hanya kode referensi, tanpa nama, alamat, atau nomor telepon.

create schema armada;

create table armada.kota (
  id    smallint primary key,
  nama  text not null unique
);

create table armada.unit (
  id              text primary key,                -- contoh: AC-SBY-0042
  kota_id         smallint not null references armada.kota(id),
  pelanggan_ref   text not null,                   -- kode samaran, bukan data pribadi
  model           text not null,                   -- [REAL DATA: kode model resmi]
  kapasitas_pk    numeric(3,1) not null check (kapasitas_pk between 0.5 and 5),
  refrigeran      text not null default 'R32',
  pola_pakai      text not null check (pola_pakai in ('rumah', 'kantor')),
  suhu_set        numeric(3,1) not null default 25,
  profil_sim      text not null default 'normal'   -- dipakai simulator saja
    check (profil_sim in ('normal', 'freon', 'kondensor', 'sensor', 'offline')),
  dipasang        date not null
);

create table armada.telemetri (
  unit_id         text not null references armada.unit(id),
  waktu           timestamptz not null,
  menyala         boolean not null,
  suhu_set        numeric(3,1),
  suhu_ruang      numeric(4,1),                    -- null bila sensor ruang galat
  suhu_luar       numeric(4,1),
  arus_kompresor  numeric(4,1),                    -- A
  tekanan_hisap   numeric(5,1),                    -- psi, perkiraan dari sensor pipa
  kode_galat      text,
  primary key (unit_id, waktu)
);
create index telemetri_waktu_idx on armada.telemetri (waktu desc);

create table armada.kode_galat (
  kode      text primary key,
  arti      text not null,
  tindakan  text not null
);

create table armada.tiket (
  id          serial primary key,
  unit_id     text not null references armada.unit(id),
  dibuat      timestamptz not null default now(),
  status      text not null default 'baru' check (status in ('baru', 'dijadwalkan', 'selesai')),
  masalah     text not null,
  peran_teknisi text,                               -- peran, bukan nama orang
  jadwal      timestamptz,
  selesai     timestamptz
);
create index tiket_status_idx on armada.tiket (status);
