-- Data contoh: 3 mitra servis, 3 akun login, 75 unit, riwayat tiket 30 hari.
-- Akun dummy (hanya untuk emulator lokal; JANGAN dipakai di cloud):
--   mitra.smg@contoh.test, mitra.sby@contoh.test, mitra.mks@contoh.test  sandi: Contoh-Mitra-2026

insert into public.mitra (id, kode, nama, kota) values
  ('11111111-1111-4111-8111-111111111111', 'SMG', 'Mitra Servis Semarang', 'Semarang'),
  ('22222222-2222-4222-8222-222222222222', 'SBY', 'Mitra Servis Surabaya', 'Surabaya'),
  ('33333333-3333-4333-8333-333333333333', 'MKS', 'Mitra Servis Makassar', 'Makassar');

-- pengguna Auth (GoTrue) dibuat langsung di skema auth; kolom token diisi '' karena GoTrue tidak menerima NULL
with akun(id, email, nama, mitra) as (values
  ('a1111111-1111-4111-8111-111111111111'::uuid, 'mitra.smg@contoh.test', 'Koordinator Semarang', '11111111-1111-4111-8111-111111111111'::uuid),
  ('a2222222-2222-4222-8222-222222222222'::uuid, 'mitra.sby@contoh.test', 'Koordinator Surabaya', '22222222-2222-4222-8222-222222222222'::uuid),
  ('a3333333-3333-4333-8333-333333333333'::uuid, 'mitra.mks@contoh.test', 'Koordinator Makassar', '33333333-3333-4333-8333-333333333333'::uuid)
), u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
         extensions.crypt('Contoh-Mitra-2026', extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('nama', nama), now(), now(),
         '', '', '', '', '', '', '', ''
  from akun returning id
), i as (
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
  from akun returning user_id
)
insert into public.profil (user_id, mitra_id, nama) select id, mitra, nama from akun;

-- 25 unit per mitra; pelanggan hanya ID tersamar
insert into public.unit (serial, model, kota, mitra_id, pelanggan_ref, dipasang)
select format('%s-%s-%s', m.model_kode, m.kode, lpad(g::text, 5, '0')),
       m.model, m.kota, m.id, 'PLG-' || upper(substr(md5(m.kode || g), 1, 6)),
       current_date - (30 + (g * 37) % 700)
from generate_series(1, 25) g
cross join lateral (
  select mt.*, x.model_kode, x.model
  from public.mitra mt,
       (values ('AC1', 'AC split 1 PK'), ('TV43', 'TV LED 43 inci'), ('KL2P', 'Kulkas 2 pintu')) x(model_kode, model)
  offset 0
) m
where (g + ascii(m.model_kode)) % 3 = 0;

select sim.backfill();
