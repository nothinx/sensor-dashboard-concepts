-- Simulator tiket servis (hanya untuk mockup/uji). Skema `sim` tidak diekspos lewat API Supabase.
-- Untuk produksi, tiket dibuat oleh sistem layanan pelanggan pabrik: [REAL DATA: integrasi call center/CRM].
create schema if not exists sim;
revoke all on schema sim from public, anon, authenticated;

create table sim.keluhan (teks text not null, prioritas text not null);
insert into sim.keluhan values
  ('AC tidak dingin, unit luar berbunyi keras', 'tinggi'),
  ('AC meneteskan air dari unit dalam', 'sedang'),
  ('TV mati total setelah listrik padam', 'tinggi'),
  ('Layar TV bergaris setelah menyala 10 menit', 'sedang'),
  ('Remote TV tidak berfungsi walau baterai baru', 'rendah'),
  ('Kulkas bagian bawah tidak dingin', 'tinggi'),
  ('Bunga es berlebih di freezer', 'rendah'),
  ('Pintu kulkas tidak menutup rapat', 'sedang'),
  ('Suara dengung keras dari kulkas di malam hari', 'rendah');

-- buat satu tiket untuk unit acak pada waktu tertentu
create function sim.tiket_baru(waktu timestamptz) returns public.tiket
language plpgsql as $$
declare
  u public.unit;
  k sim.keluhan;
  t public.tiket;
begin
  select * into u from public.unit order by random() limit 1;
  select * into k from sim.keluhan order by random() limit 1;
  insert into public.tiket (nomor, mitra_id, unit_serial, keluhan, prioritas, dibuat_pada)
  values ('TK-' || to_char(waktu at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
          u.mitra_id, u.serial, k.teks, k.prioritas, waktu)
  on conflict (nomor) do nothing
  returning * into t;
  return t;
end $$;

-- riwayat 30 hari: sebagian besar sudah selesai, sebagian kecil terlambat ditanggapi
create function sim.backfill() returns void
language plpgsql as $$
declare
  w timestamptz := now() - interval '30 days';
  t public.tiket;
  lambat numeric;
begin
  if exists (select 1 from public.tiket) then return; end if;
  while w < now() - interval '2 hours' loop
    t := sim.tiket_baru(w);
    if t.id is not null then
      -- mitra MKS sedikit lebih lambat supaya perbandingan kinerja terlihat
      lambat := case when (select kode from public.mitra where id = t.mitra_id) = 'MKS' then 1.6 else 1 end;
      update public.tiket set
        status = 'selesai',
        ditanggapi_pada = dibuat_pada + make_interval(mins => (20 + random() * 300 * lambat)::int),
        jadwal_kunjungan = dibuat_pada + interval '1 day',
        selesai_pada = dibuat_pada + interval '1 day' + make_interval(mins => (60 + random() * 180)::int)
      where id = t.id;
    end if;
    w := w + make_interval(mins => (90 + random() * 240)::int);
  end loop;
  -- beberapa tiket masih terbuka: baru (belum ditanggapi), dijadwalkan, dikerjakan
  for i in 1..9 loop
    perform sim.tiket_baru(now() - make_interval(mins => (10 + random() * 220)::int));
  end loop;
  update public.tiket set status = 'dijadwalkan', ditanggapi_pada = dibuat_pada + interval '35 minutes',
         jadwal_kunjungan = date_trunc('hour', now()) + interval '1 day 2 hours'
  where id in (select id from public.tiket where status = 'baru' order by dibuat_pada limit 3);
end $$;

-- satu langkah simulasi (dipanggil berkala oleh layanan simulator)
create function sim.tick() returns void
language plpgsql as $$
begin
  if random() < 0.35 then perform sim.tiket_baru(now()); end if;
  -- mitra lain kadang menanggapi tiket lama secara otomatis agar daftar tidak menumpuk
  update public.tiket set status = 'dijadwalkan', ditanggapi_pada = now(), jadwal_kunjungan = now() + interval '1 day'
  where id in (select id from public.tiket where status = 'baru' and dibuat_pada < now() - interval '3 hours' order by random() limit 1)
    and random() < 0.3;
  update public.tiket set status = 'dikerjakan' where status = 'dijadwalkan' and jadwal_kunjungan < now();
  update public.tiket set status = 'selesai', selesai_pada = now()
  where status = 'dikerjakan' and jadwal_kunjungan < now() - interval '2 hours';
end $$;
