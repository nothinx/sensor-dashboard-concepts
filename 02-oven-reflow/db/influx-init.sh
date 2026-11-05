#!/bin/bash
# Dijalankan sekali oleh image influxdb setelah setup awal (CLI sudah memakai token admin).
# Membuat bucket hasil downsampling dan task yang mengisinya tiap menit.
# Tanpa "set -e": skrip ini bisa di-source oleh entrypoint image.
influx bucket create --name oven_1m --org "$DOCKER_INFLUXDB_INIT_ORG" --retention 400d
influx task create --org "$DOCKER_INFLUXDB_INIT_ORG" --file /etc/influx-tasks/downsample_oven_1m.flux
