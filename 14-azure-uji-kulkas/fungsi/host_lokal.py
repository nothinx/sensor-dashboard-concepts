"""Host lokal yang meniru Cosmos DB trigger Azure Functions.

Azure Functions membaca change feed container `pengujian` dan menyimpan posisinya di lease container.
Di lokal, kita membaca change feed per lini (partition key) dengan SDK, menyimpan token lanjutan di
container `leases`, lalu memanggil `proses_batch` yang sama dengan versi cloud.
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common.cosmos import siapkan  # noqa: E402
from fungsi.proses import proses_batch  # noqa: E402

JEDA_S = float(os.environ.get("FEED_JEDA_S", "2"))
LINI = ["L1", "L2"]  # ponytail: daftar lini tetap; baca dari konfigurasi bila lini bertambah


def baca_lease(leases, lini):
    try:
        return leases.read_item(f"feed-{lini}", partition_key=f"feed-{lini}").get("token")
    except Exception:
        return None


def jalan():
    c = siapkan()
    pengujian, alarm, leases = c["pengujian"], c["alarm"], c["leases"]
    print("host change feed lokal berjalan", flush=True)
    while True:
        for lini in LINI:
            token = baca_lease(leases, lini)
            kwargs = {"partition_key": lini, "max_item_count": 200}
            kwargs.update({"continuation": token} if token else {"start_time": "Beginning"})
            batch = list(pengujian.query_items_change_feed(**kwargs))
            token_baru = pengujian.client_connection.last_response_headers.get("etag")
            if batch:
                n = proses_batch(batch, pengujian, alarm)
                print(f"{lini}: {len(batch)} dokumen, {n} alarm", flush=True)
            if token_baru and token_baru != token:
                leases.upsert_item({"id": f"feed-{lini}", "token": token_baru})
        time.sleep(JEDA_S)


if __name__ == "__main__":
    jalan()
