#!/usr/bin/env bash
# Deploy proyek 14 ke langganan Azure MILIK KLIEN. CONTOH; belum pernah dijalankan.
# Jalankan sendiri setelah `az login` dengan akun klien. Membuat resource berbayar.
set -euo pipefail

RG="${RG:-rg-konsep-uji-akhir}"
LOKASI="${LOKASI:-southeastasia}"   # [REAL DATA: region pilihan klien]
NAMA="${NAMA:-polyuji}"

az group create -n "$RG" -l "$LOKASI"
az deployment group create -g "$RG" -f infra/main.bicep -p nama="$NAMA" lokasi="$LOKASI"

# Rute pesan perangkat ke Cosmos DB (identitas hub perlu peran data di Cosmos DB lebih dulu).
# [REAL DATA: cek sintaks `az iot hub message-endpoint create cosmosdb-container` di versi az CLI terbaru]
HUB_PID=$(az iot hub identity show -n "${NAMA}-hub" -g "$RG" --query principalId -o tsv)
COSMOS_ID=$(az cosmosdb show -n "${NAMA}-cosmos" -g "$RG" --query id -o tsv)
az cosmosdb sql role assignment create -a "${NAMA}-cosmos" -g "$RG" \
  --role-definition-id 00000000-0000-0000-0000-000000000002 --principal-id "$HUB_PID" --scope "$COSMOS_ID"
az iot hub message-endpoint create cosmosdb-container -n "${NAMA}-hub" -g "$RG" --en ke-pengujian \
  --endpoint-uri "$(az cosmosdb show -n "${NAMA}-cosmos" -g "$RG" --query documentEndpoint -o tsv)" \
  --database-name ujiakhir --container pengujian --identity "[system]" --pkn lini --pkt "{lini}"
az iot hub message-route create -n "${NAMA}-hub" -g "$RG" --rn uji-akhir --en ke-pengujian --source devicemessages --enabled true

# Kode fungsi change feed (folder fungsi/ + common/ + db/)
func azure functionapp publish "${NAMA}-fungsi" --python
