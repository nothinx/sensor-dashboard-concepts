#!/usr/bin/env bash
# Uji Row Level Security dengan curl + JWT: mitra SMG tidak boleh melihat atau mengubah data mitra SBY.
# Jalankan setelah `npx supabase@3.0.0 start`. Keluar dengan kode 1 bila ada pemeriksaan yang gagal.
set -u
API=${API:-http://127.0.0.1:18121}
ANON=$(sed -n 's/.*anonKey: "\(.*\)".*/\1/p' "$(dirname "$0")/web/config.js")
SANDI=Contoh-Mitra-2026
gagal=0
cek() { if [ "$2" = "$3" ]; then echo "LULUS  $1 ($2)"; else echo "GAGAL  $1: dapat '$2', harap '$3'"; gagal=1; fi; }

token() {
  curl -s "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$SANDI\"}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
}
rest() { curl -s "$API/rest/v1/$2" -H "apikey: $ANON" -H "Authorization: Bearer $1"; }

A=$(token mitra.smg@contoh.test)
B=$(token mitra.sby@contoh.test)
[ -n "$A" ] && [ -n "$B" ] || { echo "GAGAL  login akun contoh"; exit 1; }

KODE_A=$(rest "$A" "mitra?select=kode" | sed -n 's/.*"kode":"\([A-Z]*\)".*/\1/p')
cek "mitra A hanya melihat mitranya sendiri" "$KODE_A" "SMG"
cek "jumlah baris mitra yang terlihat oleh A" "$(rest "$A" 'mitra?select=id' | grep -o '"id"' | wc -l | tr -d ' ')" "1"

ID_B=$(rest "$B" "mitra?select=id" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
cek "A membaca tiket milik mitra B" "$(rest "$A" "tiket?select=id&mitra_id=eq.$ID_B")" "[]"
cek "A membaca unit milik mitra B" "$(rest "$A" "unit?select=serial&mitra_id=eq.$ID_B")" "[]"

TIKET_B=$(rest "$B" "tiket?select=id&status=neq.selesai&limit=1" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
UBAH=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/rest/v1/tiket?id=eq.$TIKET_B" -H "apikey: $ANON" -H "Authorization: Bearer $A" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"status":"selesai"}')
STATUS_B=$(rest "$B" "tiket?select=status&id=eq.$TIKET_B")
cek "A mengubah tiket B: status tiket B tetap" "$(echo "$STATUS_B" | grep -c selesai)" "0"
echo "       (PATCH oleh A dijawab HTTP $UBAH; 0 baris terubah karena RLS)"

cek "anon tanpa login membaca tiket" "$(curl -s -o /dev/null -w '%{http_code}' "$API/rest/v1/tiket?select=id" -H "apikey: $ANON")" "401"
KOLOM=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/rest/v1/tiket?id=eq.$TIKET_B" -H "apikey: $ANON" -H "Authorization: Bearer $B" \
  -H "Content-Type: application/json" -d '{"mitra_id":"'"$ID_B"'"}')
cek "B mengubah kolom mitra_id (tidak diizinkan)" "$KOLOM" "403"
cek "kinerja_mitra untuk A bisa dipanggil" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/rpc/kinerja_mitra" -H "apikey: $ANON" -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"hari":30}')" "200"
exit $gagal
