"""Koneksi Cosmos DB bersama untuk API, fungsi change feed, dan simulator.

Mode dipilih lewat env COSMOS_MODE:
- emulator (bawaan): Azure Cosmos DB Emulator Linux di Docker, kunci emulator publik.
- cloud: akun Cosmos DB milik klien. Bila COSMOS_KEY kosong, pakai Microsoft Entra ID
  (managed identity / DefaultAzureCredential), cara yang disarankan di produksi.
"""
import json
import os
import time
from pathlib import Path

from azure.cosmos import CosmosClient, PartitionKey, exceptions

SKEMA = json.loads((Path(__file__).resolve().parent.parent / "db" / "containers.json").read_text(encoding="utf-8"))


def klien() -> CosmosClient:
    mode = os.environ.get("COSMOS_MODE", "emulator")
    endpoint = os.environ["COSMOS_ENDPOINT"]
    kunci = os.environ.get("COSMOS_KEY", "")
    if mode == "cloud" and not kunci:
        from azure.identity import DefaultAzureCredential  # hanya dibutuhkan di cloud
        return CosmosClient(endpoint, credential=DefaultAzureCredential())
    if not kunci:
        raise RuntimeError("COSMOS_KEY kosong. Salin .env.example ke .env dan isi kunci emulator.")
    return CosmosClient(endpoint, credential=kunci)


def siapkan(tunggu_detik: int = 180):
    """Buat database dan container bila belum ada; tunggu emulator siap. Mengembalikan dict container."""
    batas = time.time() + tunggu_detik
    while True:
        try:
            c = klien()
            db = c.create_database_if_not_exists(SKEMA["database"])
            hasil = {}
            for k in SKEMA["containers"]:
                hasil[k["id"]] = db.create_container_if_not_exists(
                    id=k["id"], partition_key=PartitionKey(path=k["partitionKey"]), default_ttl=k["defaultTtl"])
            return hasil
        except (exceptions.CosmosHttpResponseError, OSError, Exception) as e:  # emulator belum siap
            if time.time() > batas:
                raise RuntimeError(f"Cosmos DB tidak siap setelah {tunggu_detik} detik: {e}") from e
            print(f"menunggu Cosmos DB: {type(e).__name__}", flush=True)
            time.sleep(3)
