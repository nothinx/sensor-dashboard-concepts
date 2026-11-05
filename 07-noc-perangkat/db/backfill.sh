#!/bin/sh
# Isi riwayat 24 jam ke TSDB Prometheus sekali saja, sebelum Prometheus pertama kali menyala.
set -e
if [ -f /prometheus/.backfill-selesai ]; then
  echo "backfill sudah pernah dijalankan, dilewati"
  exit 0
fi
promtool tsdb create-blocks-from openmetrics /bf/backfill.om /prometheus
touch /prometheus/.backfill-selesai
echo "backfill selesai"
