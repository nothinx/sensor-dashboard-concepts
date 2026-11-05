"""Kumpulkan semua penanda [REAL DATA: ...] di 15 proyek menjadi docs/KEBUTUHAN-DATA-KLIEN.md.

Jalankan dari folder induk:  python shared/alat/kumpulkan_real_data.py
Penanda yang sama dalam satu proyek digabung; kolom "Lokasi" menyebut berkas pertama yang memuatnya.
"""
import re
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLA = re.compile(r"\[REAL DATA:\s*([^\]\n]{3,160}?)\s*\]")
EKSTENSI = {".md", ".html", ".js", ".mjs", ".py", ".sql", ".php", ".yaml", ".yml", ".toml", ".json"}
LEWATI = {"node_modules", ".shot", "public", ".firebase", "data", "vendor"}


def berkas_proyek(folder):
    for p in sorted(folder.rglob("*")):
        if p.is_file() and p.suffix in EKSTENSI and not (set(p.relative_to(folder).parts) & LEWATI):
            yield p


def kumpulkan():
    hasil = OrderedDict()
    for folder in sorted(ROOT.glob("[01][0-9]-*")):
        temuan = OrderedDict()
        for p in berkas_proyek(folder):
            for m in POLA.finditer(p.read_text(encoding="utf-8", errors="ignore")):
                isi = " ".join(m.group(1).split())
                if isi in {"...", "…"} or "${" in isi:
                    continue  # contoh format atau templat kode, bukan kebutuhan nyata
                temuan.setdefault(isi, p.relative_to(folder).as_posix())
        hasil[folder.name] = temuan
    return hasil


def tulis(hasil):
    total = sum(len(t) for t in hasil.values())
    baris = [
        "# Kebutuhan data dari klien",
        "",
        "Daftar ini dihasilkan otomatis oleh `shared/alat/kumpulkan_real_data.py` dari penanda `[REAL DATA: ...]`",
        "di semua proyek. Jangan disunting manual; perbarui penandanya di proyek lalu jalankan ulang skrip.",
        "",
        f"Total {total} butir di {len(hasil)} proyek. Butir yang sama di beberapa proyek cukup diminta sekali.",
        "",
        "## Semua proyek",
        "",
        "| Data yang dibutuhkan | Dipakai di |",
        "|---|---|",
        "| Logo perusahaan (SVG) | slot `[LOGO KLIEN]` di kepala setiap dasbor |",
        "| Warna merek resmi | token aksen di `web/style.css` tiap proyek |",
        "| Nama produk/sistem yang dipakai klien | judul dasbor dan `<title>` |",
        "| Proyek mana yang dilanjutkan | menentukan data sensor asli yang perlu dihubungkan |",
        "",
    ]
    for proyek, temuan in hasil.items():
        baris += [f"## {proyek}", ""]
        if not temuan:
            baris += ["Tidak ada penanda.", ""]
            continue
        baris += ["| Data yang dibutuhkan | Lokasi pertama |", "|---|---|"]
        baris += [f"| {isi} | `{lokasi}` |" for isi, lokasi in temuan.items()]
        baris.append("")
    out = ROOT / "docs" / "KEBUTUHAN-DATA-KLIEN.md"
    out.parent.mkdir(exist_ok=True)
    out.write_bytes("\n".join(baris).encode("utf-8"))
    return out, total


if __name__ == "__main__":
    hasil = kumpulkan()
    assert len(hasil) == 15, f"harus 15 proyek, ketemu {len(hasil)}"
    out, total = tulis(hasil)
    print(f"{out}: {total} butir")
