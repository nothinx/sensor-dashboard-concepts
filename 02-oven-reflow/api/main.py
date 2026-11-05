"""API proyek 02: Monitor Oven Reflow SMT.

Semua query Flux dijalankan di server (token InfluxDB tidak pernah sampai ke browser).
Dasbor menarik /api/lines/{line}/dashboard tiap 5 detik.
"""
import os
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.staticfiles import StaticFiles
from influxdb_client import InfluxDBClient

ORG = os.environ["INFLUX_ORG"]
RAW = os.environ["INFLUX_BUCKET"]
TOL = float(os.environ.get("ZONE_TOLERANCE_C", "3"))
LIQUIDUS = float(os.environ.get("LIQUIDUS_C", "217"))
RECIPES = {"L1": os.environ.get("RECIPE_L1", "[REAL DATA: nama resep Line 1]"),
           "L2": os.environ.get("RECIPE_L2", "[REAL DATA: nama resep Line 2]")}
Line = Literal["L1", "L2"]
ZONE = Path(pattern=r"^Z([1-9]|10)$")

client = InfluxDBClient(url=os.environ["INFLUX_URL"], token=os.environ["INFLUX_TOKEN"], org=ORG, timeout=10_000)
q = client.query_api()
app = FastAPI(title="Monitor Oven Reflow SMT", version="1.0.0",
              description="API proyek 02 (data contoh). Lihat docs/API.md.")


def rows(flux: str, **params) -> list[dict]:
    try:
        tables = q.query(flux, params=params)
    except Exception as e:  # InfluxDB mati/lambat → 503 dengan sebab yang jelas
        raise HTTPException(503, f"InfluxDB tidak menjawab: {e.__class__.__name__}") from e
    return [r.values for t in tables for r in t.records]


def latest_zones(line: str) -> list[dict]:
    recs = rows(f'''
      from(bucket: "{RAW}") |> range(start: -2m)
        |> filter(fn: (r) => r._measurement == "zone" and r.line == _line)
        |> last() |> group() |> pivot(rowKey: ["zone"], columnKey: ["_field"], valueColumn: "_value")''', _line=line)
    out = []
    for r in sorted(recs, key=lambda r: int(r["zone"][1:])):
        delta = r["actual"] - r["setpoint"]
        out.append({"zone": r["zone"], "setpoint": r["setpoint"], "actual": round(r["actual"], 1),
                    "delta": round(delta, 1), "heater_pct": round(r["heater_pct"], 0), "fan_rpm": round(r["fan_rpm"]),
                    "status": "crit" if abs(delta) > TOL else "warn" if abs(delta) > TOL * 0.66 else "ok"})
    return out


def overview(line: str) -> dict:
    recs = rows(f'''
      from(bucket: "{RAW}") |> range(start: -2m)
        |> filter(fn: (r) => r._measurement == "oven" and r.line == _line)
        |> last() |> group() |> pivot(rowKey: ["line"], columnKey: ["_field"], valueColumn: "_value")''', _line=line)
    if not recs:
        return {}
    r = recs[0]
    return {"o2_ppm": round(r["o2_ppm"]), "conveyor_mpm": r["conveyor_mpm"],
            "conveyor_recipe_mpm": r["conveyor_recipe_mpm"], "boards_shift": int(r["boards_shift"])}


def profile(line: str) -> dict | None:
    recs = rows(f'''
      from(bucket: "{RAW}") |> range(start: -25m)
        |> filter(fn: (r) => r._measurement == "profile" and r.line == _line and r._field == "temp")
        |> group(columns: ["run"]) |> sort(columns: ["_time"])''', _line=line)
    if not recs:
        return None
    run = max(r["run"] for r in recs)
    pts = [r for r in recs if r["run"] == run]
    t0 = pts[0]["_time"]
    step = (pts[1]["_time"] - t0).total_seconds() if len(pts) > 1 else 5
    temps = [round(p["_value"], 1) for p in pts]
    return {"run": run, "start": t0.isoformat(), "step_s": step, "temps": temps,
            "peak_c": max(temps), "tal_s": round(sum(1 for x in temps if x > LIQUIDUS) * step)}


def trend(line: str, zone: str, rng: str, every: str) -> list[dict]:
    recs = rows(f'''
      from(bucket: "{RAW}") |> range(start: -{rng})
        |> filter(fn: (r) => r._measurement == "zone" and r.line == _line and r.zone == _zone and r._field == "actual")
        |> aggregateWindow(every: {every}, fn: mean, createEmpty: true)''', _line=line, _zone=zone)
    return [{"t": r["_time"].isoformat(), "v": None if r["_value"] is None else round(r["_value"], 2)} for r in recs]


@app.get("/api/health")
def health():
    if not client.ping():
        raise HTTPException(503, "InfluxDB tidak menjawab ping")
    return {"ok": True}


@app.get("/api/lines")
def lines():
    return [{"id": k, "name": f"Line {k[1:]}", "recipe": v} for k, v in RECIPES.items()]


@app.get("/api/lines/{line}/dashboard")
def dashboard(line: Line):
    zones = latest_zones(line)
    if not zones:
        raise HTTPException(503, "Belum ada data zona dalam 2 menit terakhir. Periksa simulator atau gateway oven.")
    focus = max(zones, key=lambda z: abs(z["delta"]))
    return {
        "line": line, "recipe": RECIPES[line], "now": datetime.now(timezone.utc).isoformat(),
        "tolerance_c": TOL, "liquidus_c": LIQUIDUS,
        "overview": overview(line), "zones": zones, "profile": profile(line),
        "focus": {**focus, "trend": trend(line, focus["zone"], "2h", "1m")},
    }


@app.get("/api/lines/{line}/zones/{zone}/trend")
def zone_trend(line: Line, zone: str = ZONE, range: Literal["2h", "24h", "7d"] = Query("24h")):
    every = {"2h": "1m", "24h": "15m", "7d": "1h"}[range]
    return {"line": line, "zone": zone, "range": range, "every": every, "points": trend(line, zone, range, every)}


app.mount("/shared", StaticFiles(directory="/srv/shared"), name="shared")
app.mount("/", StaticFiles(directory="/srv/web", html=True), name="web")
