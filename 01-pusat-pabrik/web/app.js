// Dasbor proyek 01: ambil snapshot REST, lalu dengarkan WebSocket untuk pembaruan tiap 5 detik.
// Tanpa API (dibuka lewat file:// atau stack mati) → data contoh bawaan + pita penjelas.
const $ = (id) => document.getElementById(id);
const ONLINE = !TANPA_API;
const LV = { "-1": "off", 0: "ok", 1: "warn", 2: "crit" };
let snap = null, sampleMode = false;

const dur = (min) => (min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} jam ${min % 60} mnt`);
const v = (x, d = 1) => (x == null ? "tidak ada data" : fmt(x, d));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function limitOf(a) {
  const hi = a.value != null && a.warn_hi != null && a.value > a.warn_hi;
  const lim = a.level === 2 ? (hi ? a.crit_hi : a.crit_lo) : hi ? a.warn_hi : a.warn_lo;
  return { lim, word: a.level === 2 ? "batas kritis" : "batas peringatan", dir: hi ? "di atas" : "di bawah" };
}

function renderLive(l) {
  const k = l.kpi;
  $("shift").textContent = `${l.shift.name} · ${l.shift.start} sampai ${l.shift.end} · sisa ${dur(l.shift.remainingMin)}`;
  $("kpis").innerHTML = `
    <div><dt>Alarm aktif</dt><dd class="big ${k.crit ? "crit" : ""}">${k.alarms}</dd></div>
    <div><dt>Sensor online</dt><dd>${k.online}<span class="u">dari ${k.total}</span></dd></div>
    <div><dt>Beban listrik</dt><dd>${v(k.powerKw, 0)}<span class="u">kW</span></dd></div>
    <div><dt>Suhu ruang produksi</dt><dd>${v(k.tempC)}<span class="u">°C</span></dd></div>
    <div><dt>Kelembapan ruang SMT</dt><dd>${v(k.rhSmt, 0)}<span class="u">%RH</span></dd></div>`;
  $("kpis").removeAttribute("aria-busy");

  const areasHit = new Set(l.alarms.map((a) => a.area)).size;
  const top = l.alarms[0];
  if (top) {
    const { lim, word, dir } = limitOf(top);
    $("finding").textContent = `Ada ${l.alarms.length} alarm aktif di ${areasHit} area`;
    $("finding2").textContent = `${top.name} ${v(top.value)} ${top.unit}, ${dir} ${word} ${fmt(lim, lim % 1 ? 1 : 0)} ${top.unit} sejak pukul ${hhmm(new Date(top.started_at))}.`;
  } else {
    $("finding").textContent = "Semua area normal";
    $("finding2").textContent = `Tidak ada alarm aktif. Data terakhir pukul ${hhmm(new Date(l.now))}.`;
  }

  const now = new Date(l.now);
  $("alarms").innerHTML = l.alarms.length ? l.alarms.map((a) => {
    const { lim, word } = limitOf(a);
    const min = Math.max(0, Math.round((now - new Date(a.started_at)) / 60000));
    return `<li>
      <div class="meta">${st(a.level === 2 ? "crit" : "warn")}<span>${hhmm(new Date(a.started_at))} · ${dur(min)}</span></div>
      <div class="what">${esc(a.area)}: ${esc(a.name)}</div>
      <div class="val"><b>${v(a.value)} ${esc(a.unit)}</b> · ${word} ${fmt(lim, lim % 1 ? 1 : 0)} ${esc(a.unit)} · puncak ${v(a.peak)}</div>
      ${a.acked_at ? `<span class="acked">Diakui pukul ${hhmm(new Date(a.acked_at))}</span>`
        : `<button class="btn" type="button" data-ack="${a.id}" ${sampleMode ? 'disabled title="Tidak tersedia di mode data contoh"' : ""}>Akui alarm</button>`}
    </li>`;
  }).join("") : `<li class="empty">Tidak ada alarm aktif. Alarm baru muncul di sini dalam 5 detik setelah batas terlewati.</li>`;

  for (const a of l.areas) {
    const el = document.querySelector(`[data-area="${a.id}"] .stat`);
    if (!el) continue;
    el.innerHTML = a.level === 2 ? st("crit") : a.level === 1 ? st("warn")
      : a.offline ? st("off", `${a.offline} sensor offline`) : st("ok");
  }
}

function renderHistory(s) {
  const h = s.history, start = new Date(h.start);
  const at = (i) => new Date(start.getTime() + i * h.stepMin * 60000);
  $("axis").innerHTML = [0, 24, 48, 72].map((i) => `<span>${hhmm(at(i))}</span>`).join("") + "<span>sekarang</span>";
  $("legend").innerHTML = `${st("ok")} ${st("warn")} ${st("crit")} ${st("off", "Sebagian offline")}`;
  $("strips").innerHTML = s.areas.map((a) => {
    const cells = h.cells[a.id] || [];
    const label = `Status 24 jam ${a.name}: ${cells.filter((c) => c > 0).length} dari 96 periode beralarm`;
    return `<div class="srow" data-area="${a.id}"><span class="nm">${esc(a.name)}</span>
      <div class="cells" role="img" aria-label="${esc(label)}">${cells.map((c, i) =>
        `<i class="${c === -1 ? "off" : c > 0 ? "l" + c : ""}${i === 95 ? " now" : ""}" title="${hhmm(at(i))}: ${c === -1 ? "sebagian offline" : LABEL[LV[c]]}"></i>`).join("")}</div>
      <span class="stat"></span></div>`;
  }).join("");
  $("strips").removeAttribute("aria-busy");
  const x = Array.from({ length: 96 }, (_, i) => at(i));
  const hOf = (el) => Math.max(150, el.parentElement.clientHeight - 64);
  const lim = s.kpi.powerLimitKw ?? 1600;
  lineChart($("power"), { x, h: hOf($("power")), unit: "kW", min: 0, max: Math.ceil((lim * 1.15) / 200) * 200, dec: 0,
    series: [{ name: "Beban", color: "var(--s1)", data: h.power }],
    bands: [{ y: lim, label: `batas kontrak ${fmt(lim, 0)} kW`, color: "var(--crit)" }] });
  lineChart($("temp"), { x, h: hOf($("temp")), unit: "°C", min: 18, max: 30,
    series: [{ name: "Suhu", color: "var(--s1)", data: h.temp }],
    bands: [{ y: 26, label: "maks 26 °C", color: "var(--warn)" }, { y: 20, label: "min 20 °C", color: "var(--warn)" }] });
}

function render(s) { snap = s; renderHistory(s); renderLive(s); }

function setConn(ok, text) {
  $("dot").className = "dot " + (ok ? "live" : "dead");
  $("conn").textContent = text;
}

// ---------- data contoh (tanpa API) ----------
function sample() {
  const names = ["SMT Line 1", "SMT Line 2", "Perakitan TV", "Perakitan kulkas", "Kompresor & utilitas", "Gudang komponen", "Cold storage B", "Uji akhir (QC)", "Panel listrik utama", "Ruang server"];
  const ids = ["smt1", "smt2", "tv", "kulkas", "util", "gudang", "csb", "qc", "panel", "server"];
  const ev = { smt1: [[24, 3, 1]], smt2: [[92, 1, 1], [93, 3, 2]], util: [[33, 12, 1], [57, 39, 1]], gudang: [[62, 34, -1]], csb: [[11, 1, 1], [23, 1, 1], [35, 1, 1], [47, 1, 1], [59, 1, 1], [71, 1, 1], [83, 1, 1], [95, 1, 1]], panel: [[50, 2, 1]] };
  const cells = {};
  for (const id of ids) {
    cells[id] = Array(96).fill(0);
    for (const [a, n, c] of ev[id] || []) for (let i = a; i < a + n && i < 96; i++) cells[id][i] = c;
  }
  const t = (min) => new Date(NOW - min * 60000).toISOString();
  return {
    now: NOW.toISOString(),
    shift: { name: "Shift 2", start: "14.00", end: "22.00", remainingMin: 328 },
    kpi: { alarms: 3, crit: 1, warn: 2, online: 16, total: 17, powerKw: 1284, powerLimitKw: 1600, tempC: 24.6, rhSmt: 48 },
    areas: ids.map((id, i) => ({ id, name: names[i], level: { smt2: 2, util: 1, csb: 1 }[id] || 0, offline: id === "gudang" ? 1 : 0 })),
    alarms: [
      { id: 1, level: 2, started_at: t(34), name: "Suhu oven zona 6 Line 2", area: "SMT Line 2", unit: "°C", value: 252.4, peak: 252.9, warn_hi: 248, crit_hi: 250 },
      { id: 2, level: 1, started_at: t(9), name: "Pintu cold storage B terbuka", area: "Cold storage B", unit: "mnt", value: 9, peak: 9, warn_hi: 5, crit_hi: 15 },
      { id: 3, level: 1, started_at: t(172), name: "Getaran kompresor K-02", area: "Kompresor & utilitas", unit: "mm/s", value: 5.3, peak: 5.4, warn_hi: 4.5, crit_hi: 7.1 },
    ],
    history: {
      start: new Date(NOW - 95 * 15 * 60000).toISOString(), stepMin: 15, cells,
      power: gen(96, { base: 1050, amp: 300, noise: 60, seed: 3 }),
      temp: gen(96, { base: 24.3, amp: 0.9, noise: 0.3, seed: 7 }),
    },
  };
}

function useSample(reason) {
  sampleMode = true;
  setConn(false, "Tidak terhubung");
  const b = $("banner");
  b.hidden = false;
  b.textContent = `Mode data contoh: ${reason} Jalankan "docker compose up -d" di folder proyek 01, lalu buka http://localhost:18010.`;
  render(sample());
}

// ---------- koneksi ----------
async function loadSnapshot() {
  const r = await fetch("/api/snapshot", { cache: "no-store" });
  if (!r.ok) throw new Error(`API menjawab ${r.status}`);
  render(await r.json());
}

function connectWs() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => setConn(true, "Langsung, tiap 5 detik");
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "tick" && snap) { snap = { ...snap, ...m }; renderLive(m); }
  };
  ws.onclose = () => { setConn(false, "Terputus, mencoba lagi"); setTimeout(connectWs, 3000); };
}

document.addEventListener("click", async (e) => {
  const id = e.target.dataset?.ack;
  if (!id || sampleMode) return;
  e.target.disabled = true;
  const r = await fetch(`/api/alarms/${id}/ack`, { method: "POST" });
  if (r.ok) loadSnapshot();
  else { e.target.disabled = false; e.target.textContent = "Gagal, coba lagi"; }
});

const tickClock = () => {
  $("clock").textContent = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });
};
tickClock();
setInterval(tickClock, 1000);
addEventListener("resize", () => snap && render(snap)); // render ulang penuh: pita baru butuh status area lagi

(async () => {
  if (!ONLINE) return useSample("dasbor dibuka langsung dari file, bukan dari server.");
  try {
    await loadSnapshot();
    connectWs();
    setInterval(() => loadSnapshot().catch(() => {}), 60000); // pita & grafik diperbarui tiap menit
  } catch (e) {
    useSample(`API tidak terhubung (${e.message}).`);
  }
})();
