"""Isi fungsi change feed: dipakai sama persis oleh Azure Functions (function_app.py) dan host lokal."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common.aturan import alarm_dari  # noqa: E402

KUERI_RIWAYAT = ("SELECT TOP 20 c.unit, c.hasil, c.alasan, c.percobaan, c.waktu FROM c "
                 "WHERE c.percobaan = 1 AND c.waktu <= @w ORDER BY c.waktu DESC")


def proses_batch(dokumen: list[dict], pengujian, alarm) -> int:
    """Untuk tiap dokumen uji baru: hitung alarm lalu tulis ke container `alarm`. Idempoten (upsert per id)."""
    n = 0
    for d in sorted(dokumen, key=lambda x: x["waktu"]):
        riwayat = list(pengujian.query_items(
            KUERI_RIWAYAT, parameters=[{"name": "@w", "value": d["waktu"]}], partition_key=d["lini"]))
        for a in alarm_dari(d, riwayat):
            alarm.upsert_item(a)
            n += 1
    return n
