# API · Pusat Pemantauan Pabrik

Basis URL: `http://localhost:18010`. Semua respons JSON, waktu dalam ISO 8601 UTC. Dasbor dan API satu
origin, jadi CORS tidak dibuka.

## Ringkasan

| Metode | Jalur | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek API dan koneksi database |
| GET | `/api/snapshot` | Keadaan terkini + riwayat 24 jam (dipanggil saat dasbor dibuka dan tiap 60 detik) |
| GET | `/api/alarms` | Alarm aktif saja |
| POST | `/api/alarms/{id}/ack` | Mengakui alarm |
| WS | `/ws` | Aliran `tick` tiap 5 detik |

## GET /api/health

```json
{ "ok": true }
```
Bila database tidak bisa dihubungi, respons 500 dari Fastify.

## GET /api/snapshot

```json
{
  "now": "2026-11-05T04:41:20.112Z",
  "shift": { "name": "Shift 1", "start": "06.00", "end": "14.00", "remainingMin": 139 },
  "kpi": {
    "alarms": 2, "crit": 1, "warn": 1, "online": 16, "total": 17,
    "powerKw": 1354.2, "powerLimitKw": 1600, "tempC": 25.3, "rhSmt": 48.4
  },
  "areas": [
    { "id": "smt2", "name": "SMT Line 2", "level": 2, "offline": 0, "sensors": 3 },
    { "id": "gudang", "name": "Gudang komponen", "level": 0, "offline": 1, "sensors": 2 }
  ],
  "alarms": [
    {
      "id": 1, "level": 2, "started_at": "2026-11-05T04:13:00.000Z", "acked_at": null, "peak": 252.8,
      "sensor_id": "TC-L2-Z6", "name": "Suhu oven zona 6 Line 2", "unit": "°C", "area": "SMT Line 2",
      "warn_lo": 240, "warn_hi": 248, "crit_lo": 235, "crit_hi": 250, "value": 252.2
    }
  ],
  "history": {
    "start": "2026-11-04T05:00:00.000Z", "stepMin": 15,
    "cells": { "smt2": [0, 0, 0, "… 96 nilai …", 1, 2, 2] },
    "power": [1157.78, "… 96 nilai …"],
    "temp": [25.07, "… 96 nilai …"]
  }
}
```

Arti `level`: `0` normal, `1` peringatan, `2` kritis, `-1` sebagian sensor offline (pada sel riwayat).
`areas[].offline` = jumlah sensor tanpa data lebih dari 60 detik. `history.cells` berisi 96 periode
15 menit, dari `start` sampai periode berjalan. Nilai `null` pada `power`/`temp` berarti tidak ada data.

## GET /api/alarms

Isi sama dengan `alarms` di snapshot.

## POST /api/alarms/{id}/ack

`id` bilangan bulat ≥ 1 (divalidasi skema Fastify; selain itu 400).

```http
POST /api/alarms/1/ack
```
```json
{ "id": "1", "acked_at": "2026-11-05T04:42:03.551Z" }
```
404 bila alarm tidak ada, sudah selesai, atau sudah diakui:
```json
{ "error": "Alarm tidak ditemukan, sudah selesai, atau sudah diakui." }
```

## WebSocket /ws

Server mengirim satu pesan tiap 5 detik ke semua klien. Klien tidak perlu mengirim apa pun.

```json
{ "type": "tick", "now": "…", "shift": { … }, "kpi": { … }, "areas": [ … ], "alarms": [ … ] }
```
Isinya sama dengan snapshot tanpa `history`. Dasbor menyambung ulang otomatis 3 detik setelah koneksi
putus dan menandai status "Terputus, mencoba lagi".

## Contoh dengan curl

```bash
curl -s localhost:18010/api/snapshot | jq '.kpi'
curl -s -X POST localhost:18010/api/alarms/1/ack
```
