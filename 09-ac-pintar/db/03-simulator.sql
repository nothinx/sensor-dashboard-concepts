-- Simulator telemetri di dalam database (schema "sim"). Dipanggil container simulator lewat psql:
--   select sim.backfill();   -- sekali saat start: isi 24 jam terakhir tiap 5 menit
--   select sim.tick();       -- tiap 30 detik: satu baris per unit untuk waktu sekarang
-- Profil gangguan per unit ada di armada.unit.profil_sim (freon, kondensor, sensor, offline).

create schema sim;

create function sim.tulis(t timestamptz, mulai timestamptz) returns integer
language plpgsql as $$
declare n integer;
begin
  insert into armada.telemetri (unit_id, waktu, menyala, suhu_set, suhu_ruang, suhu_luar, arus_kompresor, tekanan_hisap, kode_galat)
  select id, t, nyala,
    case when nyala then suhu_set end,
    case
      when profil_sim = 'sensor' then null
      when not nyala then round((luar - 1.5 + random() * 0.5)::numeric, 1)
      when profil_sim = 'freon' then round((suhu_set + 1 + 3.5 * prog + random() * 0.5)::numeric, 1)
      when profil_sim = 'kondensor' then round((suhu_set + 1.8 + random() * 0.6)::numeric, 1)
      else round((suhu_set + 0.4 + random() * 0.8)::numeric, 1)
    end,
    round(luar::numeric, 1),
    case when not nyala then 0 else round((kapasitas_pk * 3.9 * (0.85 + random() * 0.15)
      * case profil_sim when 'kondensor' then 1.4 when 'freon' then 1 - 0.25 * prog else 1 end)::numeric, 1) end,
    case when not nyala then null
      when profil_sim = 'freon' then round((132 - 40 * prog + random() * 3)::numeric, 1)
      when profil_sim = 'kondensor' then round((146 + random() * 5)::numeric, 1)
      else round((132 + random() * 6)::numeric, 1) end,
    case
      when profil_sim = 'sensor' and nyala then 'E1'
      when profil_sim = 'kondensor' and nyala and t > now() - interval '3 hours' and abs(hashtext(id)) % 2 = 0 then 'E5'
      when profil_sim = 'freon' and nyala and prog > 0.9 and abs(hashtext(id)) % 2 = 1 then 'P2'
    end
  from (
    select u.*, jam,
      28 + 4 * sin((jam - 9) / 24 * 2 * pi()) + (random() - 0.5) as luar,
      least(1, greatest(0, extract(epoch from t - mulai) / 86400.0)) as prog,
      case
        when u.profil_sim <> 'normal' then jam between 7 and 23
        when u.pola_pakai = 'kantor' then jam between 8 and 17
        else jam >= 18 or jam < 5 or (jam between 12 and 15 and abs(hashtext(u.id)) % 2 = 0)
      end as nyala
    from armada.unit u,
      lateral (select extract(hour from t at time zone 'Asia/Jakarta')
                    + extract(minute from t at time zone 'Asia/Jakarta') / 60.0 as jam) j
    -- unit "offline" berhenti mengirim 95 menit terakhir
    where not (u.profil_sim = 'offline' and t > now() - interval '95 minutes')
  ) s
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create function sim.backfill() returns integer
language plpgsql as $$
declare t timestamptz; n integer := 0; mulai timestamptz := date_trunc('minute', now()) - interval '24 hours';
begin
  if exists (select 1 from armada.telemetri) then return 0; end if;
  for t in select generate_series(mulai, now(), interval '5 minutes') loop
    n := n + sim.tulis(t, mulai);
  end loop;
  return n;
end $$;

create function sim.tick() returns integer
language plpgsql as $$
begin
  -- retensi 7 hari (lihat docs/DATABASE.md)
  delete from armada.telemetri where waktu < now() - interval '7 days';
  return sim.tulis(now(), coalesce((select min(waktu) from armada.telemetri), now()));
end $$;
