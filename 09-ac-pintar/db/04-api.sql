-- Permukaan API (schema "api"). PostgREST hanya mengekspos schema ini.
-- Semua view dimiliki superuser sehingga web_anon cukup diberi SELECT pada view, tanpa akses ke tabel inti.

create schema api;

-- Status terkini per unit. Aturan status (lihat docs/DATABASE.md §Aturan status):
--   offline      : pembacaan terakhir lebih dari 15 menit lalu
--   kritis       : unit melaporkan kode galat
--   perlu_servis : menyala tetapi ruang > 2,5 °C di atas suhu set, tekanan hisap < 115 psi,
--                  atau arus > 125 % arus nominal (3,9 A per PK)
create view api.unit_status as
select
  u.id as unit_id, k.nama as kota, u.model, u.kapasitas_pk, u.refrigeran, u.pelanggan_ref, u.dipasang,
  a.waktu as terakhir, a.menyala, a.suhu_set, a.suhu_ruang, a.suhu_luar, a.arus_kompresor, a.tekanan_hisap, a.kode_galat,
  s.status,
  case s.status
    when 'offline' then 'Tidak mengirim data sejak pukul ' || to_char(a.waktu at time zone 'Asia/Jakarta', 'HH24.MI')
    when 'kritis' then g.arti
    when 'perlu_servis' then case
      when a.tekanan_hisap < 115 then 'Tekanan hisap rendah, kemungkinan refrigeran berkurang'
      when a.arus_kompresor > u.kapasitas_pk * 3.9 * 1.25 then 'Arus kompresor tinggi, kemungkinan kondensor kotor'
      else 'Ruangan tidak mencapai suhu set' end
  end as alasan,
  t.id as tiket_id, t.status as tiket_status
from armada.unit u
join armada.kota k on k.id = u.kota_id
left join lateral (
  select * from armada.telemetri x where x.unit_id = u.id order by x.waktu desc limit 1
) a on true
left join armada.kode_galat g on g.kode = a.kode_galat
left join lateral (
  select id, status from armada.tiket tk where tk.unit_id = u.id and tk.status <> 'selesai' order by tk.dibuat desc limit 1
) t on true
cross join lateral (select case
    when a.waktu is null or a.waktu < now() - interval '15 minutes' then 'offline'
    when a.kode_galat is not null then 'kritis'
    when a.menyala and (a.suhu_ruang - a.suhu_set > 2.5 or a.tekanan_hisap < 115
                        or a.arus_kompresor > u.kapasitas_pk * 3.9 * 1.25) then 'perlu_servis'
    else 'normal' end as status) s;

create view api.per_kota as
select kota,
  count(*) as total,
  count(*) filter (where status <> 'normal') as bermasalah
from api.unit_status group by kota;

create view api.galat_24jam as
select t.kode_galat as kode, g.arti, g.tindakan,
  count(distinct t.unit_id) as jumlah_unit, count(*) as jumlah_laporan
from armada.telemetri t join armada.kode_galat g on g.kode = t.kode_galat
where t.waktu > now() - interval '24 hours'
group by t.kode_galat, g.arti, g.tindakan;

create view api.tiket as
select t.id, t.unit_id, k.nama as kota, u.model, t.dibuat, t.status, t.masalah, t.peran_teknisi, t.jadwal, t.selesai
from armada.tiket t join armada.unit u on u.id = t.unit_id join armada.kota k on k.id = u.kota_id;

create view api.telemetri as
select unit_id, waktu, menyala, suhu_set, suhu_ruang, suhu_luar, arus_kompresor, tekanan_hisap, kode_galat
from armada.telemetri;

create view api.kode_galat as select kode, arti, tindakan from armada.kode_galat;

-- RPC ringkasan armada: POST/GET /rpc/ringkasan_armada
create function api.ringkasan_armada() returns json
language sql stable as $$
  select json_build_object(
    'total', count(*),
    'terhubung', count(*) filter (where status <> 'offline'),
    'normal', count(*) filter (where status = 'normal'),
    'perlu_servis', count(*) filter (where status = 'perlu_servis'),
    'kritis', count(*) filter (where status = 'kritis'),
    'offline', count(*) filter (where status = 'offline'),
    'tiket_baru', (select count(*) from api.tiket where status = 'baru'),
    'tiket_dijadwalkan', (select count(*) from api.tiket where status = 'dijadwalkan'),
    'bermasalah_tanpa_tiket', count(*) filter (where status <> 'normal' and tiket_id is null),
    'diperbarui', now())
  from api.unit_status
$$;

grant usage on schema api to web_anon;
grant select on all tables in schema api to web_anon;
grant execute on function api.ringkasan_armada() to web_anon;
