"""API REST proyek 03 · Pemantauan Energi Listrik. Hanya pustaka standar Python.

Setiap respons JSON membawa ETag (hash isi). Klien mengirim If-None-Match; bila isi tidak berubah
server menjawab 304 tanpa badan. Server yang sama menyajikan dasbor statis (web/) dan
/shared/charts.{js,css}.
"""
import hashlib
import json
import os
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

WIB = timezone(timedelta(hours=7))
INTERVAL = 900
DB_PATH = os.environ.get("DB_PATH", "/data/energi.db")
ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = Path(os.environ.get("WEB_DIR", ROOT / "web"))
SHARED_DIR = Path(os.environ.get("SHARED_DIR", ROOT.parent / "shared"))
SHARED_FILES = {"charts.js", "charts.css"}
PORT = int(os.environ.get("PORT", "8000"))


class Galat(Exception):
    def __init__(self, status, pesan):
        super().__init__(pesan)
        self.status, self.pesan = status, pesan


def koneksi():
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only=1")
    return conn


def konfig(conn):
    return {r["kunci"]: float(r["nilai"]) for r in conn.execute("SELECT kunci, nilai FROM konfigurasi")}


def iso(ts):
    return datetime.fromtimestamp(ts, WIB).isoformat(timespec="minutes")


def rentang_hari(tgl):
    awal = int(datetime(tgl.year, tgl.month, tgl.day, tzinfo=WIB).timestamp())
    return awal, awal + 86400


def tanggal_param(q):
    s = q.get("tanggal", [None])[0]
    if s is None:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise Galat(400, "Parameter tanggal harus berformat YYYY-MM-DD, mis. 2026-11-05.")


def data_terakhir(conn):
    (ts,) = conn.execute("SELECT MAX(ts) FROM pembacaan WHERE meter_id='PM-MDP'").fetchone()
    if ts is None:
        raise Galat(503, "Belum ada pembacaan. Simulator atau pengumpul data belum mengisi database.")
    return ts


def hari_data(conn, tgl):
    """Tanggal yang diminta, atau hari dari interval terakhir bila tidak diminta."""
    return tgl or datetime.fromtimestamp(data_terakhir(conn), WIB).date()


def beban(conn, jam):
    akhir = data_terakhir(conn) + INTERVAL
    rows = conn.execute(
        "SELECT ts, kw_rata, kw_maks FROM pembacaan WHERE meter_id='PM-MDP' AND ts >= ? AND ts < ? ORDER BY ts",
        (akhir - jam * 3600, akhir),
    ).fetchall()
    return [{"ts": iso(r["ts"]), "kw": r["kw_rata"], "kw_maks": r["kw_maks"]} for r in rows]


def energi_per_jam(conn, tgl):
    awal, akhir = rentang_hari(tgl)
    per = {r["j"]: r["kwh"] for r in conn.execute(
        "SELECT (ts - ?) / 3600 AS j, SUM(kwh) AS kwh FROM pembacaan "
        "WHERE meter_id='PM-MDP' AND ts >= ? AND ts < ? GROUP BY j", (awal, awal, akhir))}
    return [{"jam": j, "kwh": round(per[j], 1) if j in per else None} for j in range(24)]


def per_area(conn, tgl):
    awal, akhir = rentang_hari(tgl)
    rows = conn.execute(
        "SELECT p.id, p.area, ROUND(SUM(b.kwh), 1) AS kwh FROM pembacaan b "
        "JOIN meter m ON m.id = b.meter_id JOIN panel p ON p.id = m.panel_id "
        "WHERE p.jenis='sub' AND b.ts >= ? AND b.ts < ? GROUP BY p.id ORDER BY kwh DESC", (awal, akhir))
    return [dict(r) for r in rows]


def panel(conn):
    k = konfig(conn)
    hasil = []
    for r in conn.execute(
        "SELECT p.id, p.nama, p.area, p.jenis, s.* FROM panel p JOIN meter m ON m.panel_id = p.id "
        "JOIN sesaat s ON s.meter_id = m.id ORDER BY p.urutan"):
        i = (r["i_r"], r["i_s"], r["i_t"])
        rata = sum(i) / 3
        tak = round(max(abs(x - rata) for x in i) / rata * 100, 1) if rata else 0.0
        masalah = []
        if r["pf"] < k["pf_min"]:
            masalah.append("Faktor daya rendah")
        if tak > k["ketidakseimbangan_maks_persen"]:
            masalah.append("Arus tidak seimbang")
        if r["thd_i"] > k["thd_i_maks_persen"]:
            masalah.append("THD arus tinggi")
        hasil.append({
            "id": r["id"], "nama": r["nama"], "area": r["area"], "jenis": r["jenis"], "ts": iso(r["ts"]),
            "kw": r["kw"], "v": [r["v_r"], r["v_s"], r["v_t"]], "i": list(i),
            "ketidakseimbangan_arus_persen": tak, "pf": r["pf"], "thd_i_persen": r["thd_i"],
            "status": "peringatan" if masalah else "normal", "masalah": masalah,
        })
    return hasil


def ringkasan(conn):
    k = konfig(conn)
    tgl = hari_data(conn, None)
    awal, akhir = rentang_hari(tgl)
    p = conn.execute(
        "SELECT ts, kw_maks FROM pembacaan WHERE meter_id='PM-MDP' AND ts >= ? AND ts < ? "
        "ORDER BY kw_maks DESC LIMIT 1", (awal, akhir)).fetchone()
    e = conn.execute(
        "SELECT ROUND(SUM(kwh), 1) AS kwh, ROUND(SUM(kwh * pf_rata) / SUM(kwh), 3) AS pf, MAX(ts) AS ts "
        "FROM pembacaan WHERE meter_id='PM-MDP' AND ts >= ? AND ts < ?", (awal, akhir)).fetchone()
    s = conn.execute("SELECT kw, ts FROM sesaat WHERE meter_id='PM-MDP'").fetchone()
    batas = k["batas_kontrak_kw"]
    # panel penyumbang terbesar saat interval puncak
    penyumbang = conn.execute(
        "SELECT p.area, b.kw_rata FROM pembacaan b JOIN meter m ON m.id=b.meter_id JOIN panel p ON p.id=m.panel_id "
        "WHERE p.jenis='sub' AND b.ts=? ORDER BY b.kw_rata DESC LIMIT 2", (p["ts"],)).fetchall() if p else []
    return {
        "tanggal": tgl.isoformat(),
        "batas_kontrak_kw": batas,
        "beban_sekarang_kw": s["kw"] if s else None,
        "beban_sekarang_ts": iso(s["ts"]) if s else None,
        "puncak_hari_ini": {"kw": p["kw_maks"], "ts": iso(p["ts"])} if p else None,
        "sisa_kapasitas_kw": round(batas - p["kw_maks"], 1) if p else None,
        "penyumbang_puncak": [dict(r) for r in penyumbang],
        "energi_hari_ini_kwh": e["kwh"],
        "pf_rata_hari_ini": e["pf"],
        "data_sampai": iso(e["ts"] + INTERVAL) if e["ts"] else None,
    }


def dasbor(conn):
    tgl = hari_data(conn, None)
    return {
        "ringkasan": ringkasan(conn),
        "beban_24_jam": beban(conn, 24),
        "energi_per_jam": energi_per_jam(conn, tgl),
        "per_area": per_area(conn, tgl),
        "panel": panel(conn),
    }


def rute(path, q):
    conn = koneksi()
    try:
        if path == "/api/v1/dasbor":
            return dasbor(conn)
        if path == "/api/v1/ringkasan":
            return ringkasan(conn)
        if path == "/api/v1/beban":
            s = q.get("jam", ["24"])[0]
            if not re.fullmatch(r"\d{1,3}", s) or not 1 <= int(s) <= 192:
                raise Galat(400, "Parameter jam harus bilangan bulat 1 sampai 192.")
            return beban(conn, int(s))
        if path == "/api/v1/energi-per-jam":
            return energi_per_jam(conn, hari_data(conn, tanggal_param(q)))
        if path == "/api/v1/area":
            return per_area(conn, hari_data(conn, tanggal_param(q)))
        if path == "/api/v1/panel":
            return panel(conn)
        if path == "/api/v1/kesehatan":
            return {"status": "ok", "data_terakhir": iso(data_terakhir(conn) + INTERVAL)}
        raise Galat(404, f"Endpoint {path} tidak ada. Lihat docs/API.md.")
    except sqlite3.OperationalError as e:
        raise Galat(503, f"Database belum siap: {e}.")
    finally:
        conn.close()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB_DIR), **kw)

    def kirim_json(self, status, body, etag=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        if etag:
            self.send_header("ETag", etag)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith("/api/"):
            try:
                data = rute(u.path, parse_qs(u.query))
            except Galat as g:
                body = json.dumps({"galat": g.pesan, "status": g.status}, ensure_ascii=False).encode()
                return self.kirim_json(g.status, body)
            body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
            etag = '"' + hashlib.sha1(body).hexdigest()[:20] + '"'
            if etag in [t.strip() for t in self.headers.get("If-None-Match", "").split(",")]:
                self.send_response(HTTPStatus.NOT_MODIFIED)
                self.send_header("ETag", etag)
                self.send_header("Cache-Control", "no-cache")
                return self.end_headers()
            return self.kirim_json(200, body, etag)
        if u.path.startswith("/shared/"):
            nama = u.path.removeprefix("/shared/")
            if nama not in SHARED_FILES:
                return self.send_error(404)
            body = (SHARED_DIR / nama).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/css" if nama.endswith(".css") else "text/javascript")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        return super().do_GET()

    def log_message(self, fmt, *args):
        if not self.path.startswith("/api/v1/kesehatan"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    print(f"api: http://0.0.0.0:{PORT}  db={DB_PATH}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
