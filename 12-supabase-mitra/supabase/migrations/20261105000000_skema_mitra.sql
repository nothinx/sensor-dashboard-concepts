-- Portal Mitra Servis: skema, Row Level Security, Realtime, fungsi kinerja.
-- Prinsip: setiap mitra hanya melihat dan mengubah data miliknya; pembatasan dilakukan di database (RLS),
-- bukan di aplikasi, sehingga aman walau kunci anon dipakai langsung dari peramban.

create table public.mitra (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique check (kode ~ '^[A-Z]{3}$'),
  nama text not null,
  kota text not null
);

-- satu baris per akun login; menghubungkan auth.users ke mitra
create table public.profil (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mitra_id uuid not null references public.mitra (id),
  nama text not null
);

create table public.unit (
  serial text primary key check (serial ~ '^[A-Z0-9-]{4,24}$'),
  model text not null,
  kota text not null,
  mitra_id uuid not null references public.mitra (id),
  pelanggan_ref text not null,              -- ID pelanggan tersamar, tanpa nama/alamat (UU PDP)
  dipasang date not null
);
create index on public.unit (mitra_id);

-- SLA waktu tanggap per prioritas: contoh, [REAL DATA: dari kontrak kemitraan servis]
create table public.sla (
  prioritas text primary key check (prioritas in ('tinggi', 'sedang', 'rendah')),
  batas_tanggap interval not null
);
insert into public.sla values ('tinggi', '4 hours'), ('sedang', '8 hours'), ('rendah', '24 hours');

create table public.tiket (
  id bigint generated always as identity primary key,
  nomor text not null unique,
  mitra_id uuid not null references public.mitra (id),
  unit_serial text not null references public.unit (serial),
  keluhan text not null check (length(keluhan) between 5 and 300),
  prioritas text not null references public.sla (prioritas),
  status text not null default 'baru' check (status in ('baru', 'dijadwalkan', 'dikerjakan', 'selesai')),
  dibuat_pada timestamptz not null default now(),
  batas_tanggap timestamptz not null,
  ditanggapi_pada timestamptz,
  jadwal_kunjungan timestamptz,
  selesai_pada timestamptz,
  check (ditanggapi_pada is null or ditanggapi_pada >= dibuat_pada)
);
create index on public.tiket (mitra_id, status);
create index on public.tiket (dibuat_pada desc);

-- batas tanggap dihitung dari SLA saat tiket dibuat
create function public.isi_batas_tanggap() returns trigger
language plpgsql as $$
begin
  select new.dibuat_pada + s.batas_tanggap into new.batas_tanggap from public.sla s where s.prioritas = new.prioritas;
  return new;
end $$;
create trigger tiket_batas before insert on public.tiket for each row execute function public.isi_batas_tanggap();

-- ---------- Row Level Security ----------
-- mitra_saya(): mitra milik pengguna yang sedang login (dari JWT). security definer agar bisa membaca profil
-- tanpa membuka tabel profil, stable agar dievaluasi sekali per kueri.
create function public.mitra_saya() returns uuid
language sql stable security definer set search_path = '' as $$
  select mitra_id from public.profil where user_id = auth.uid()
$$;
revoke all on function public.mitra_saya() from public;
grant execute on function public.mitra_saya() to authenticated;

alter table public.mitra enable row level security;
alter table public.profil enable row level security;
alter table public.unit enable row level security;
alter table public.tiket enable row level security;
alter table public.sla enable row level security;

create policy "mitra: baca milik sendiri" on public.mitra for select to authenticated using (id = (select public.mitra_saya()));
create policy "profil: baca diri sendiri" on public.profil for select to authenticated using (user_id = (select auth.uid()));
create policy "unit: baca milik mitra" on public.unit for select to authenticated using (mitra_id = (select public.mitra_saya()));
create policy "tiket: baca milik mitra" on public.tiket for select to authenticated using (mitra_id = (select public.mitra_saya()));
create policy "tiket: ubah milik mitra" on public.tiket for update to authenticated
  using (mitra_id = (select public.mitra_saya())) with check (mitra_id = (select public.mitra_saya()));
create policy "sla: baca semua" on public.sla for select to authenticated using (true);

-- hak tabel: anon tidak mendapat apa pun; authenticated hanya baca, dan hanya boleh mengubah kolom status tiket
revoke all on public.mitra, public.profil, public.unit, public.tiket, public.sla from anon, authenticated;
grant select on public.mitra, public.profil, public.unit, public.tiket, public.sla to authenticated;
grant update (status, ditanggapi_pada, jadwal_kunjungan, selesai_pada) on public.tiket to authenticated;

-- ---------- Kinerja: angka sendiri dibanding rata-rata semua mitra (tanpa nama mitra lain) ----------
create function public.kinerja_mitra(hari int default 30)
returns table (tanggap_saya_menit numeric, tanggap_semua_menit numeric, tepat_sla_saya numeric, tepat_sla_semua numeric, tiket_saya bigint)
language sql stable security definer set search_path = '' as $$
  with t as (
    select mitra_id, extract(epoch from ditanggapi_pada - dibuat_pada) / 60 as menit, ditanggapi_pada <= batas_tanggap as tepat
    from public.tiket
    where ditanggapi_pada is not null and dibuat_pada >= now() - make_interval(days => least(greatest(hari, 1), 90))
  )
  select round(avg(menit) filter (where mitra_id = public.mitra_saya()), 0),
         round(avg(menit), 0),
         round(100.0 * avg(tepat::int) filter (where mitra_id = public.mitra_saya()), 1),
         round(100.0 * avg(tepat::int), 1),
         count(*) filter (where mitra_id = public.mitra_saya())
  from t
$$;
revoke all on function public.kinerja_mitra(int) from public;
grant execute on function public.kinerja_mitra(int) to authenticated;

-- ---------- Realtime: tiket baru dan perubahan status didorong ke peramban (tetap tunduk RLS) ----------
alter publication supabase_realtime add table public.tiket;
