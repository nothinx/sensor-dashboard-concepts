"""Ekspor spesifikasi OpenAPI ke YAML: python export_openapi.py <keluaran.yaml>

Mengimpor app tanpa membuka koneksi basis data (pool baru dibuka saat lifespan).
"""
import sys

import yaml

from main import app

with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as f:
    yaml.safe_dump(app.openapi(), f, allow_unicode=True, sort_keys=False)
print("openapi ditulis ke", sys.argv[1])
