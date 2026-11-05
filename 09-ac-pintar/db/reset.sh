#!/bin/sh
# Muat ulang skema + data contoh tanpa menghapus volume (peran tetap). Jalankan:
#   docker compose exec db sh /docker-entrypoint-initdb.d/reset.sh
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'drop schema if exists api, sim, armada cascade'
for f in /docker-entrypoint-initdb.d/0[1-9]-*.sql; do psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"; done
psql -qt -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'select sim.backfill()'
