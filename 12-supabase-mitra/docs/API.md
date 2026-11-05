# API · Portal Mitra Servis

Tidak ada backend buatan sendiri. Peramban memakai **supabase-js 2.45.4** ke gateway Supabase
(`http://127.0.0.1:18121` lokal, `https://<ref>.supabase.co` di cloud). Semua permintaan membawa header
`apikey: <anon key>` dan, setelah login, `Authorization: Bearer <JWT pengguna>`. Hasil setiap kueri sudah
dibatasi RLS ke mitra milik pengguna.

## Autentikasi (Auth / GoTrue)

```js
const { data, error } = await sb.auth.signInWithPassword({ email, password });
```

Setara REST:

```bash
curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"mitra.smg@contoh.test","password":"Contoh-Mitra-2026"}'
# → {"access_token":"eyJ…","token_type":"bearer","expires_in":3600,"refresh_token":"…","user":{…}}
```

Sandi salah → `400 {"code":"invalid_credentials"}`; portal menampilkan "Email atau sandi salah…".
Pendaftaran mandiri dimatikan (`enable_signup = false`).

## Kueri yang dipakai portal

| Kegunaan | supabase-js | REST setara |
|---|---|---|
| Profil + mitra | `from("profil").select("nama, mitra:mitra(kode, nama, kota)").single()` | `GET /rest/v1/profil?select=nama,mitra:mitra(kode,nama,kota)` |
| Tiket terbuka | `from("tiket").select("id, nomor, keluhan, prioritas, status, dibuat_pada, batas_tanggap, ditanggapi_pada, jadwal_kunjungan, unit:unit(serial, model, kota, pelanggan_ref)").neq("status", "selesai").order("batas_tanggap")` | `GET /rest/v1/tiket?select=…&status=neq.selesai&order=batas_tanggap` |
| Riwayat 30 hari | `from("tiket").select("unit_serial, keluhan, dibuat_pada, unit:unit(model, pelanggan_ref)").gte("dibuat_pada", sejak)` | `GET /rest/v1/tiket?select=…&dibuat_pada=gte.<iso>` |
| Kinerja | `rpc("kinerja_mitra", { hari: 30 })` | `POST /rest/v1/rpc/kinerja_mitra` body `{"hari":30}` |
| Tanggapi tiket | `from("tiket").update({ status: "dijadwalkan", ditanggapi_pada, jadwal_kunjungan }).eq("id", id)` | `PATCH /rest/v1/tiket?id=eq.<id>` |

Contoh jawaban tiket terbuka:

```json
[{
  "id": 214, "nomor": "TK-261105-8163", "keluhan": "AC tidak dingin, unit luar berbunyi keras",
  "prioritas": "tinggi", "status": "baru",
  "dibuat_pada": "2026-11-05T05:36:00+00:00", "batas_tanggap": "2026-11-05T09:36:00+00:00",
  "ditanggapi_pada": null, "jadwal_kunjungan": null,
  "unit": {"serial": "KL2P-SMG-00006", "model": "Kulkas 2 pintu", "kota": "Semarang", "pelanggan_ref": "PLG-99AC86"}
}]
```

Contoh jawaban `kinerja_mitra`:

```json
[{"tanggap_saya_menit": 156, "tanggap_semua_menit": 197, "tepat_sla_saya": 95.8, "tepat_sla_semua": 88.2, "tiket_saya": 71}]
```

`hari` dibatasi 1 sampai 90 di dalam fungsi. Angka "semua" adalah rata-rata seluruh mitra; tidak ada angka per
mitra lain yang dikembalikan.

## Realtime

```js
sb.channel("tiket-mitra")
  .on("postgres_changes", { event: "*", schema: "public", table: "tiket" }, (e) => { /* INSERT → notifikasi, lalu muat ulang */ })
  .subscribe();
```

Tabel `tiket` ada di publikasi `supabase_realtime`. Realtime mengevaluasi RLS untuk setiap pelanggan, sehingga
perubahan tiket mitra lain tidak dikirim (diuji: tiket SMG tidak muncul di portal SBY).

## Galat yang ditangani portal

| Kondisi | Kode | Tampilan di portal |
|---|---|---|
| Sandi salah | 400 `invalid_credentials` | pesan di bawah formulir masuk |
| Tanpa login | 401 | portal menampilkan layar masuk |
| Mengubah kolom yang tidak diizinkan | 403 `42501` | notifikasi "Gagal menyimpan…" |
| Mengubah tiket mitra lain | 200, 0 baris berubah | tidak mungkin dari UI; dicegah RLS |
| Supabase tidak terjangkau | jaringan | pita "Mode data contoh" + data bawaan |
| Profil tidak ada untuk akun | PGRST116 | "Profil mitra tidak ditemukan… Hubungi admin pabrik." |
