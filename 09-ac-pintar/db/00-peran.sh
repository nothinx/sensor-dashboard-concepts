#!/bin/sh
# Peran PostgREST: "authenticator" (login, tanpa hak sendiri) beralih ke "web_anon" (baca saja, schema api).
# Kata sandi dari env AUTHENTICATOR_PASSWORD, tidak ditulis di repo.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
create role web_anon nologin;
create role authenticator noinherit login password '${AUTHENTICATOR_PASSWORD}';
grant web_anon to authenticator;
EOSQL
