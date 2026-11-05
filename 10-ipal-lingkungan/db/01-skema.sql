-- Skema IPAL & emisi lingkungan (MariaDB 11). Semua waktu disimpan sebagai DATETIME dalam WIB (Asia/Jakarta).

create table titik (
  kode     char(2) primary key,               -- S1..S4
  nama     varchar(80) not null,
  tahap    varchar(80) not null,
  urutan   tinyint not null,
  wajib_baku_mutu boolean not null default false  -- baku mutu berlaku di titik buang (outlet)
);

create table parameter (
  kode     varchar(8) primary key,            -- ph, cod, tss, nh3n, debit, suhu
  nama     varchar(60) not null,
  satuan   varchar(16) not null,
  bm_min   decimal(10,3) null,
  bm_maks  decimal(10,3) null,
  desimal  tinyint not null default 1,
  keterangan varchar(200) null
);

create table pembacaan (
  id        bigint unsigned auto_increment primary key,
  titik     char(2) not null,
  parameter varchar(8) not null,
  waktu     datetime not null,
  nilai     decimal(10,3) not null,
  unique key uq_bacaan (titik, parameter, waktu),
  key ix_waktu (waktu),
  constraint fk_bacaan_titik foreign key (titik) references titik(kode),
  constraint fk_bacaan_param foreign key (parameter) references parameter(kode)
) engine=InnoDB;

create table hasil_lab (
  id               int unsigned auto_increment primary key,
  titik            char(2) not null,
  parameter        varchar(8) not null,
  tanggal_sampling date not null,
  nilai            decimal(10,3) not null,
  lab              varchar(120) not null,
  catatan          varchar(200) null,
  key ix_lab (titik, tanggal_sampling),
  constraint fk_lab_titik foreign key (titik) references titik(kode),
  constraint fk_lab_param foreign key (parameter) references parameter(kode)
) engine=InnoDB;

-- Rentang waktu parameter di titik wajib melewati baku mutu. selesai NULL = masih berlangsung.
create table kejadian (
  id        int unsigned auto_increment primary key,
  titik     char(2) not null,
  parameter varchar(8) not null,
  mulai     datetime not null,
  selesai   datetime null,
  puncak    decimal(10,3) not null,
  batas     decimal(10,3) not null,
  key ix_kejadian_aktif (titik, parameter, selesai),
  constraint fk_kej_titik foreign key (titik) references titik(kode),
  constraint fk_kej_param foreign key (parameter) references parameter(kode)
) engine=InnoDB;

-- Log pengiriman data ke sistem pelaporan eksternal lewat webhook.
create table webhook_log (
  id          int unsigned auto_increment primary key,
  waktu       datetime not null,
  url         varchar(255) not null,
  dari        datetime not null,
  sampai      datetime not null,
  jumlah_data int unsigned not null,
  status_http smallint null,
  durasi_ms   int unsigned null,
  hasil       enum('terkirim', 'gagal') not null,
  galat       varchar(255) null,
  key ix_webhook_waktu (waktu)
) engine=InnoDB;
