"""Versi Azure Functions (Python v2 programming model) untuk deploy ke cloud. TIDAK dipakai di emulator lokal.

Trigger Cosmos DB membaca change feed container `pengujian`; posisi baca disimpan di container `leases`.
Koneksi memakai identitas terkelola: app setting `CosmosDb__accountEndpoint` (lihat docs/CLOUD.md).
"""
import os

import azure.functions as func
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

from fungsi.proses import proses_batch

app = func.FunctionApp()
_db = CosmosClient(os.environ["CosmosDb__accountEndpoint"], credential=DefaultAzureCredential()).get_database_client("ujiakhir")


@app.cosmos_db_trigger(arg_name="dokumen", connection="CosmosDb", database_name="ujiakhir",
                       container_name="pengujian", lease_container_name="leases",
                       create_lease_container_if_not_exists=False)
def alarm_uji_akhir(dokumen: func.DocumentList) -> None:
    proses_batch([d.to_dict() for d in dokumen], _db.get_container_client("pengujian"), _db.get_container_client("alarm"))
