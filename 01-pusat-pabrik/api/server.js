// API proyek 01: snapshot REST + dorongan WebSocket tiap 5 detik. Juga mengevaluasi alarm
// (buka/tutup) dari nilai terbaru, dan menyajikan dasbor (web/) serta pustaka bersama (shared/).
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fstatic from "@fastify/static";
import pg from "pg";

const db = new pg.Pool(); // PG* dari env
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
const TICK_MS = 5000;
const STALE_MS = 60_000; // sensor tanpa data > 60 detik dianggap offline
const TZ_MIN = Number(process.env.TZ_OFFSET_MIN ?? 420);
const SHIFTS = (process.env.SHIFT_STARTS ?? "06:00,14:00,22:00").split(",").map((s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
});
const PROD_AREAS = ["smt1", "smt2", "tv", "kulkas", "qc"];

const level = (s, v) => {
  if (v == null) return -1;
  if (v > (s.crit_hi ?? Infinity) || v < (s.crit_lo ?? -Infinity)) return 2;
  if (v > (s.warn_hi ?? Infinity) || v < (s.warn_lo ?? -Infinity)) return 1;
  return 0;
};

function shiftNow(now = Date.now()) {
  const day = 1440, m = ((Math.floor(now / 60000) + TZ_MIN) % day + day) % day;
  const sorted = [...SHIFTS].sort((a, b) => a - b);
  let i = sorted.findLastIndex((s) => s <= m);
  if (i < 0) i = sorted.length - 1;
  const start = sorted[i], end = sorted[(i + 1) % sorted.length];
  const hm = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}.${String(x % 60).padStart(2, "0")}`;
  return { name: `Shift ${SHIFTS.indexOf(start) + 1}`, start: hm(start), end: hm(end), remainingMin: (end - m + day) % day };
}

async function latest() {
  const { rows } = await db.query(`
    SELECT s.*, a.name AS area, l.time, l.value
    FROM sensor s JOIN area a ON a.id = s.area_id
    LEFT JOIN LATERAL (
      SELECT time, value FROM reading r
      WHERE r.sensor_id = s.id AND r.time > now() - interval '1 day'
      ORDER BY time DESC LIMIT 1) l ON true
    ORDER BY a.sort, s.id`);
  const now = Date.now();
  for (const r of rows) {
    r.offline = !r.time || now - r.time.getTime() > STALE_MS;
    r.level = r.offline ? -1 : level(r, r.value);
  }
  return rows;
}

// Buka/tutup alarm berdasarkan nilai terbaru. Sensor offline tidak membuka alarm nilai.
async function evaluate(sensors) {
  for (const s of sensors) {
    if (s.level > 0) {
      const hi = s.value > (s.warn_hi ?? Infinity);
      // ponytail: awal alarm = pembacaan pertama setelah nilai normal terakhir (jendela 2 hari); cukup untuk 17 titik
      await db.query(`
        INSERT INTO alarm (sensor_id, level, started_at, peak)
        VALUES ($1, $2, coalesce((
          SELECT min(time) FROM reading WHERE sensor_id = $1 AND time > coalesce((
            SELECT max(time) FROM reading WHERE sensor_id = $1 AND time > now() - interval '2 days'
              AND value <= coalesce($4::float8, 'Infinity') AND value >= coalesce($5::float8, '-Infinity')), now() - interval '2 days')), now()), $3)
        ON CONFLICT (sensor_id) WHERE ended_at IS NULL DO UPDATE SET
          level = greatest(alarm.level, excluded.level),
          peak = CASE WHEN $6::boolean THEN greatest(alarm.peak, excluded.peak) ELSE least(alarm.peak, excluded.peak) END`,
        [s.id, s.level, s.value, s.warn_hi, s.warn_lo, hi]);
    } else if (s.level === 0) {
      await db.query("UPDATE alarm SET ended_at = now() WHERE sensor_id = $1 AND ended_at IS NULL", [s.id]);
    }
  }
}

async function live() {
  const sensors = await latest();
  await evaluate(sensors);
  const { rows: alarms } = await db.query(`
    SELECT a.id, a.level, a.started_at, a.acked_at, a.peak, s.id AS sensor_id, s.name, s.unit, ar.name AS area,
           s.warn_lo, s.warn_hi, s.crit_lo, s.crit_hi
    FROM alarm a JOIN sensor s ON s.id = a.sensor_id JOIN area ar ON ar.id = s.area_id
    WHERE a.ended_at IS NULL ORDER BY a.level DESC, a.started_at`);
  const byId = Object.fromEntries(sensors.map((s) => [s.id, s]));
  const areas = [];
  for (const s of sensors) {
    let a = areas.find((x) => x.id === s.area_id);
    if (!a) areas.push((a = { id: s.area_id, name: s.area, level: 0, offline: 0, sensors: 0 }));
    a.sensors++;
    if (s.offline) a.offline++;
    else a.level = Math.max(a.level, s.level);
  }
  const vals = (pred) => sensors.filter((s) => !s.offline && pred(s)).map((s) => s.value);
  const avg = (xs) => (xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : null);
  return {
    now: new Date().toISOString(),
    shift: shiftNow(),
    kpi: {
      alarms: alarms.length,
      crit: alarms.filter((a) => a.level === 2).length,
      warn: alarms.filter((a) => a.level === 1).length,
      online: sensors.filter((s) => !s.offline).length,
      total: sensors.length,
      powerKw: byId["PM-MDP"]?.offline ? null : byId["PM-MDP"]?.value ?? null,
      powerLimitKw: byId["PM-MDP"]?.crit_hi ?? null,
      tempC: avg(vals((s) => s.kind === "room_temp" && PROD_AREAS.includes(s.area_id))),
      rhSmt: avg(vals((s) => s.kind === "rh" && s.area_id.startsWith("smt"))),
    },
    areas,
    alarms: alarms.map((a) => ({ ...a, value: byId[a.sensor_id]?.value ?? null })),
  };
}

async function history() {
  const bucketMs = 15 * 60000;
  const end = Math.floor(Date.now() / bucketMs) * bucketMs;
  const start = end - 95 * bucketMs;
  const idx = (d) => Math.round((d.getTime() - start) / bucketMs);
  const [cells, power, temp, counts] = await Promise.all([
    db.query(`
      SELECT s.area_id, r.bucket,
        max(CASE WHEN r.max > coalesce(s.crit_hi, 'Infinity') OR r.min < coalesce(s.crit_lo, '-Infinity') THEN 2
                 WHEN r.max > coalesce(s.warn_hi, 'Infinity') OR r.min < coalesce(s.warn_lo, '-Infinity') THEN 1
                 ELSE 0 END) AS lvl,
        count(*) AS reporting
      FROM reading_15m r JOIN sensor s ON s.id = r.sensor_id
      WHERE r.bucket >= $1 GROUP BY 1, 2`, [new Date(start)]),
    db.query("SELECT bucket, avg FROM reading_15m WHERE sensor_id = 'PM-MDP' AND bucket >= $1", [new Date(start)]),
    db.query(`SELECT r.bucket, avg(r.avg) AS avg FROM reading_15m r JOIN sensor s ON s.id = r.sensor_id
              WHERE s.kind = 'room_temp' AND s.area_id = ANY($2) AND r.bucket >= $1 GROUP BY 1`, [new Date(start), PROD_AREAS]),
    db.query("SELECT area_id, count(*)::int AS n FROM sensor GROUP BY 1"),
  ]);
  const perArea = Object.fromEntries(counts.rows.map((r) => [r.area_id, r.n]));
  const grid = {};
  for (const id of Object.keys(perArea)) grid[id] = Array(96).fill(-1);
  for (const r of cells.rows) {
    const i = idx(r.bucket);
    if (i < 0 || i > 95) continue;
    grid[r.area_id][i] = r.lvl > 0 ? r.lvl : Number(r.reporting) < perArea[r.area_id] ? -1 : 0;
  }
  const series = (rows) => {
    const out = Array(96).fill(null);
    for (const r of rows) { const i = idx(r.bucket); if (i >= 0 && i <= 95) out[i] = Math.round(r.avg * 100) / 100; }
    return out;
  };
  return { start: new Date(start).toISOString(), stepMin: 15, cells: grid, power: series(power.rows), temp: series(temp.rows) };
}

await app.register(websocket);
await app.register(fstatic, { root: "/srv/web" });
await app.register(fstatic, { root: "/srv/shared", prefix: "/shared/", decorateReply: false });

app.get("/api/health", async () => {
  await db.query("SELECT 1");
  return { ok: true };
});
app.get("/api/snapshot", async () => ({ ...(await live()), history: await history() }));
app.get("/api/alarms", async () => (await live()).alarms);
app.post("/api/alarms/:id/ack", {
  schema: { params: { type: "object", properties: { id: { type: "integer", minimum: 1 } }, required: ["id"] } },
}, async (req, reply) => {
  const { rows } = await db.query(
    "UPDATE alarm SET acked_at = now() WHERE id = $1 AND ended_at IS NULL AND acked_at IS NULL RETURNING id, acked_at",
    [req.params.id]);
  if (!rows.length) return reply.code(404).send({ error: "Alarm tidak ditemukan, sudah selesai, atau sudah diakui." });
  return rows[0];
});

const clients = new Set();
app.get("/ws", { websocket: true }, (socket) => {
  clients.add(socket);
  socket.on("close", () => clients.delete(socket));
});

let busy = false;
setInterval(async () => {
  if (busy) return; // ponytail: satu evaluasi berjalan pada satu waktu; cukup untuk satu instans API
  busy = true;
  try {
    const msg = JSON.stringify({ type: "tick", ...(await live()) });
    for (const c of clients) if (c.readyState === 1) c.send(msg);
  } catch (e) {
    app.log.error(e, "tick gagal");
  } finally { busy = false; }
}, TICK_MS);

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 8080) });
