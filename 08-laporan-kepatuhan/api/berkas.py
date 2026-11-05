"""Pembuat berkas laporan: CSV (modul csv) dan PDF teks satu kolom tanpa pustaka luar.

python berkas.py  -> self-check
"""
import csv
import io

BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September",
         "Oktober", "November", "Desember"]


def tgl(d):
    return f"{d.day} {BULAN[d.month - 1]} {d.year}"


def persen(v):
    return "-" if v is None else f"{v:.1f}".replace(".", ",")


def csv_bytes(header, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue().encode("utf-8-sig")  # BOM supaya Excel membaca UTF-8


def _esc(s):
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def pdf_bytes(baris, per_halaman=64):
    """PDF A4, huruf Courier 9 pt. ponytail: teks satu kolom saja; pakai ReportLab/WeasyPrint bila butuh tata letak."""
    halaman = [baris[i:i + per_halaman] for i in range(0, max(len(baris), 1), per_halaman)]
    objs = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    }
    kids, n = [], 4
    for i, isi in enumerate(halaman, 1):
        teks = isi + ["", f"Halaman {i} dari {len(halaman)}"]
        stream = "\n".join(["BT /F1 9 Tf 12 TL 48 800 Td"] + [f"({_esc(t)}) '" for t in teks] + ["ET"])
        data = stream.encode("cp1252", "replace")
        objs[n + 1] = b"<< /Length %d >>\nstream\n" % len(data) + data + b"\nendstream"
        objs[n] = (f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                   f"/Resources << /Font << /F1 3 0 R >> >> /Contents {n + 1} 0 R >>").encode()
        kids.append(n)
        n += 2
    objs[2] = f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>".encode()
    out = bytearray(b"%PDF-1.4\n")
    offs = {}
    for i in sorted(objs):
        offs[i] = len(out)
        out += f"{i} 0 obj\n".encode() + objs[i] + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{offs[i]:010d} 00000 n \n".encode() for i in range(1, len(objs) + 1))
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


if __name__ == "__main__":
    import datetime as dt
    p = pdf_bytes([f"baris {i} (uji) 99,5 °C" for i in range(130)])
    assert p.startswith(b"%PDF-1.4") and p.rstrip().endswith(b"%%EOF")
    assert p.count(b"/Type /Page ") == 3, p.count(b"/Type /Page ")
    xref_pos = int(p.rsplit(b"startxref\n", 1)[1].split(b"\n")[0])
    assert p[xref_pos:xref_pos + 4] == b"xref"
    assert csv_bytes(["a"], [[1]]).startswith(b"\xef\xbb\xbfa\n1")
    assert tgl(dt.date(2026, 11, 5)) == "5 November 2026" and persen(99.04) == "99,0"
    print("cek berkas ok")
