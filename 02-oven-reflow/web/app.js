// Dasbor proyek 02: polling REST tiap 5 detik untuk line yang dipilih.
// Tanpa API (file:// atau stack mati) → data contoh bawaan + pita penjelas.
const $ = (id) => document.getElementById(id);
const ONLINE = !TANPA_API;
// fase per zona; kepala tabel menggabungkan zona berurutan yang fasenya sama
const FN = ["Pemanasan awal", "Pemanasan awal", "Soak", "Soak", "Soak", "Reflow", "Reflow", "Reflow", "Pendinginan", "Pendinginan"];
const POLL_MS = 5000;
let line = "L2", data = null, sampleMode = false, lastOk = null, focusRange = "2h";

const NB = " "; // spasi tak terputus antara angka dan satuan di kalimat
const sign = (x, d = 1) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${fmt(Math.abs(x), d)}`;
const u = (s) => `<span class="u"> ${s}</span>`; // satuan: lebih kecil, lebih ringan, spasi tipis
const lineName = (l) => `Line ${l.slice(1)}`;
// lebar kolom label tabel zona = ruang sumbu Y kurva, supaya tiap kolom zona lurus di bawah titik kurvanya
const axW = (W) => (W < 700 ? 44 : W < 1000 ? 152 : 176);

function renderHead(d) {
  const bad = d.zones.filter((z) => z.status === "crit");
  const f = d.focus, ov = d.overview, tol = `±${fmt(d.tolerance_c, 0)}${NB}°C`;
  if (bad.length) {
    const z = bad.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    $("finding").textContent = `${lineName(d.line)} menyimpang dari resep: zona${NB}${z.zone.slice(1)} bersuhu ${fmt(z.actual)}${NB}°C, setpoint ${fmt(z.setpoint, 0)}${NB}°C`;
    const parts = [`Selisih ${sign(z.delta)}${NB}°C, lebih dari toleransi ${tol}.`];
    if (z.delta > 0 && z.heater_pct >= 95) parts.push(`Daya pemanas ${z.zone} tetap ${fmt(z.heater_pct, 0)}${NB}% walau suhunya sudah di atas setpoint, jadi pemanas kemungkinan tidak lagi mengikuti pengendali.`);
    if (ov.conveyor_mpm < ov.conveyor_recipe_mpm) parts.push(`Konveyor berjalan ${fmt(ov.conveyor_mpm, 2)}${NB}m/menit, lebih lambat dari resep ${fmt(ov.conveyor_recipe_mpm, 2)}${NB}m/menit.`);
    $("finding2").textContent = parts.join(" ");
  } else {
    $("finding").textContent = `${lineName(d.line)} sesuai resep di semua 10 zona`;
    $("finding2").textContent = `Selisih terbesar ada di zona ${f.zone.slice(1)}: ${sign(f.delta)}${NB}°C, masih dalam toleransi ${tol}.`;
  }
  $("np").textContent = `${lineName(d.line)} · 10 zona · resep ${d.recipe}`;
  $("kpis").innerHTML = `
    <div><dt>Zona di luar toleransi ${tol}</dt><dd class="big ${bad.length ? "crit" : ""}">${bad.length}${u("dari 10 zona")}</dd></div>
    <div><dt>Kecepatan konveyor</dt><dd>${fmt(ov.conveyor_mpm, 2)}${u("m/menit")}</dd><div class="d">Resep ${fmt(ov.conveyor_recipe_mpm, 2)}${NB}m/menit</div></div>
    <div><dt>Kadar O₂ di oven</dt><dd>${fmt(ov.o2_ppm, 0)}${u("ppm")}</dd><div class="d">Batas contoh 1.000${NB}ppm</div></div>
    <div><dt>PCB diproses shift ini</dt><dd>${fmt(ov.boards_shift, 0)}${u("papan")}</dd></div>`;
}

// momen: kurva 10 zona + pita toleransi + pelat zona
function renderZones(d) {
  const el = $("zones"), W = el.clientWidth || 900, L = axW(W), T = 20, B = 12;
  // tinggi kurva mengisi sisa layar di atas tabel (tabel dirender lebih dulu), 240 sampai 400 px
  const free = innerHeight - (el.getBoundingClientRect().top + scrollY) - document.querySelector(".table-wrap").offsetHeight - 64;
  const H = W < 700 ? 240 : Math.round(Math.max(240, Math.min(400, free)));
  const lo = 50, hi = 280, tol = d.tolerance_c, z = d.zones;
  const sx = (i) => L + ((i + 0.5) / z.length) * (W - L);
  const sy = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let g = "";
  z.forEach((_, i) => { g += `<line x1="${L + (i / z.length) * (W - L)}" x2="${L + (i / z.length) * (W - L)}" y1="${T}" y2="${H - B}" stroke="var(--grid)"/>`; });
  for (let v = 50; v <= 275; v += 75) g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`;
  const up = z.map((r, i) => `${sx(i)},${sy(r.setpoint + tol)}`), dn = z.map((r, i) => `${sx(i)},${sy(r.setpoint - tol)}`).reverse();
  g += `<polygon points="${up.concat(dn).join(" ")}" fill="var(--accent-tint)" stroke="var(--accent-edge)"/>`;
  g += `<path d="${z.map((r, i) => `${i ? "L" : "M"}${sx(i)},${sy(r.setpoint)}`).join("")}" fill="none" stroke="var(--s2)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  g += `<path d="${z.map((r, i) => `${i ? "L" : "M"}${sx(i)},${sy(r.actual)}`).join("")}" fill="none" stroke="var(--s1)" stroke-width="2"/>`;
  z.forEach((r, i) => {
    const c = r.status === "crit" ? "var(--crit)" : r.status === "warn" ? "var(--warn)" : "var(--s1)";
    g += `<circle cx="${sx(i)}" cy="${sy(r.actual)}" r="${r.status === "ok" ? 4 : 6}" fill="${c}" stroke="var(--surface)" stroke-width="2"><title>${r.zone}: ${fmt(r.actual)} °C, setpoint ${fmt(r.setpoint, 0)} °C</title></circle>`;
    if (r.status === "crit") g += `<text class="ann" x="${sx(i) + (i > 7 ? -12 : 12)}" y="${sy(r.actual) - 12}" text-anchor="${i > 7 ? "end" : "start"}">${r.zone} ${sign(r.delta)} °C</text>`;
  });
  el.innerHTML = `<svg class="zone-svg" viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Suhu aktual dan setpoint 10 zona ${lineName(d.line)}">${g}</svg>`;
  document.querySelector(".zone-p").style.setProperty("--ax", `${L}px`);
  $("zone-sub").textContent = `Pembacaan pukul ${hhmm(new Date(d.now))}, dalam °C`;
}

function renderFocus(d, points) {
  const f = d.focus, tol = d.tolerance_c;
  $("h-focus").textContent = `Zona ${f.zone.slice(1)}, selisih terbesar`;
  $("focus").innerHTML = `
    <div class="big ${f.status === "crit" ? "" : "ok"}">${fmt(f.actual)}${u("°C")}</div>
    <dl class="dl">
      <dt>Setpoint</dt><dd>${fmt(f.setpoint)}${u("°C")}</dd>
      <dt>Selisih</dt><dd>${sign(f.delta)}${u("°C")}</dd>
      <dt>Daya pemanas</dt><dd>${fmt(f.heater_pct, 0)}${u("%")}</dd>
      <dt>Putaran kipas</dt><dd>${fmt(f.fan_rpm, 0)}${u("rpm")}</dd>
    </dl>
    <div class="ph"><h2>Tren zona ${f.zone.slice(1)}</h2>
      <div class="right seg" role="group" aria-label="Rentang tren">
        <button type="button" class="tabbtn" data-range="2h" aria-pressed="${focusRange === "2h"}">2 jam</button>
        <button type="button" class="tabbtn" data-range="24h" aria-pressed="${focusRange === "24h"}">24 jam</button>
      </div></div>
    <div id="ftrend" data-label="Tren suhu zona ${f.zone}"></div>
    <p class="legend key"><span><i class="tol"></i>Batas toleransi ±${fmt(tol, 0)} °C</span></p>`;
  const pts = points || f.trend;
  lineChart($("ftrend"), { x: pts.map((p) => new Date(p.t)), h: 170, unit: "°C", min: f.setpoint - 12, max: f.setpoint + 12,
    series: [{ name: f.zone, color: "var(--s1)", data: pts.map((p) => p.v) }],
    bands: [{ y: f.setpoint + tol, label: "", color: "var(--crit)" }, { y: f.setpoint - tol, label: "", color: "var(--crit)" }] });
}

function renderProfile(d) {
  const p = d.profile;
  if (!p) { $("profile").innerHTML = `<p class="skeleton">Belum ada papan uji yang lewat dalam 25 menit terakhir. Papan uji dijalankan tiap 10 menit.</p>`; $("prof-dl").innerHTML = ""; $("prof-sub").textContent = ""; return; }
  const t0 = new Date(p.start);
  $("prof-sub").textContent = `Masuk oven pukul ${hhmm(t0)}`;
  // label likuidus tidak ditulis di grafik (menabrak puncak kurva); dijelaskan di daftar bawah
  lineChart($("profile"), { x: p.temps.map((_, i) => new Date(t0.getTime() + i * p.step_s * 1000)), h: 230, unit: "°C", min: 0, max: 280, dec: 1,
    fmtX: (t) => `${Math.round((t - t0) / 1000)} detik`, series: [{ name: "Papan", color: "var(--s1)", data: p.temps }],
    bands: [{ y: d.liquidus_c, label: "", color: "var(--warn)" }] });
  $("prof-dl").innerHTML = `
    <dt><span class="legend"><span><i class="liq"></i>Likuidus</span></span></dt><dd>${fmt(d.liquidus_c, 0)}${u("°C")}</dd>
    <dt>Waktu di atas likuidus<span class="d">Target contoh 45 sampai 90 detik</span></dt><dd>${p.tal_s}${u("detik")}</dd>
    <dt>Suhu puncak papan<span class="d">Target contoh 235 sampai 250 °C</span></dt><dd>${fmt(p.peak_c)}${u("°C")}</dd>`;
}

function renderTable(d) {
  $("table-sub").textContent = `Setpoint dan pembacaan 10 zona ${lineName(d.line)}, toleransi ±${fmt(d.tolerance_c, 0)} °C`;
  const zs = d.zones, row = (label, f, cls = () => "") => `<tr><th scope="row">${label}</th>${zs.map((z, i) => `<td class="${cls(z)}">${f(z, i)}</td>`).join("")}</tr>`;
  // zona berurutan dengan fase sama digabung jadi satu sel ber-braket
  const phases = [];
  FN.forEach((n, i) => (phases.length && phases.at(-1).n === n ? phases.at(-1).k++ : phases.push({ n, k: 1 })));
  $("zt-head").innerHTML =
    `<tr><th scope="col" class="corner phase">Fase</th>${phases.map((p) => `<th scope="colgroup" colspan="${p.k}" class="phase">${p.n}<span></span></th>`).join("")}</tr>` +
    `<tr><th scope="col" class="corner">Zona</th>${zs.map((z) => `<th scope="col"><span class="plate ${z.status}">${z.zone}</span></th>`).join("")}</tr>`;
  $("zt").innerHTML = [
    row(`Setpoint<span class="u">°C</span>`, (z) => fmt(z.setpoint)),
    row(`Aktual<span class="u">°C</span>`, (z) => fmt(z.actual)),
    row(`Selisih<span class="u">°C</span>`, (z) => sign(z.delta), (z) => (z.status === "crit" ? "bad" : "")),
    row(`Daya pemanas<span class="u">%</span>`, (z) => fmt(z.heater_pct, 0)),
    row(`Putaran kipas<span class="u">rpm</span>`, (z) => fmt(z.fan_rpm, 0)),
    row("Status", (z) => (z.status === "crit" ? st("crit", "Di luar") : z.status === "warn" ? st("warn", "Dekat batas") : st("ok", "Sesuai"))),
  ].join("");
}

function render(d) {
  data = d;
  renderHead(d); renderTable(d); renderZones(d); renderFocus(d); renderProfile(d);
  $("main").removeAttribute("aria-busy");
  $("updated").textContent = sampleMode ? `Pembacaan pukul ${hhmm(new Date(d.now))}` : `Diperbarui pukul ${new Date(d.now).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false })}`;
}

// ---------- data contoh ----------
function sample(l) {
  const sp = [120, 150, 165, 175, 185, 245, 255, 250, 120, 80];
  const act = l === "L2" ? [120.4, 149.6, 165.8, 174.1, 186.0, 252.4, 254.2, 249.1, 118.7, 81.3] : [119.8, 150.3, 164.6, 175.4, 184.7, 245.6, 254.6, 250.4, 120.9, 79.6];
  const heat = l === "L2" ? [42, 38, 35, 33, 37, 100, 71, 64, 0, 0] : [41, 39, 36, 32, 38, 63, 70, 65, 0, 0];
  const zones = sp.map((s, i) => {
    const delta = +(act[i] - s).toFixed(1);
    return { zone: `Z${i + 1}`, setpoint: s, actual: act[i], delta, heater_pct: heat[i], fan_rpm: [1450, 1450, 1500, 1500, 1500, 1800, 1800, 1800, 2100, 2100][i],
      status: Math.abs(delta) > 3 ? "crit" : Math.abs(delta) > 2 ? "warn" : "ok" };
  });
  const focus = zones.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a));
  const tr = gen(120, { base: focus.setpoint + 0.4, amp: 0.4, noise: 0.5, seed: 11 });
  if (l === "L2") for (let i = 80; i < 120; i++) tr[i] = +(focus.setpoint + 0.4 + ((i - 80) / 40) * 7).toFixed(2);
  const temps = Array.from({ length: 60 }, (_, k) => { const s = k * 5;
    return s < 90 ? 30 + s * 1.6 : s < 180 ? 174 + (s - 90) * 0.25 : s < 230 ? 196 + (s - 180) * 1.06 : s < 250 ? 249 - (s - 230) * 0.2 : Math.max(60, 245 - (s - 250) * 2.6); });
  return {
    line: l, recipe: `[REAL DATA: nama resep ${lineName(l)}]`, now: NOW.toISOString(), tolerance_c: 3, liquidus_c: 217,
    overview: { o2_ppm: l === "L2" ? 820 : 760, conveyor_mpm: l === "L2" ? 0.75 : 0.9, conveyor_recipe_mpm: 0.9, boards_shift: l === "L2" ? 1946 : 2118 },
    zones, profile: { run: "contoh", start: new Date(NOW - 27 * 60000).toISOString(), step_s: 5, temps, peak_c: 249, tal_s: 75 },
    focus: { ...focus, trend: tr.map((v, i) => ({ t: new Date(NOW - (119 - i) * 60000).toISOString(), v })) },
  };
}

// ---------- koneksi ----------
async function load() {
  if (sampleMode) return render(sample(line));
  try {
    const r = await fetch(`/api/lines/${line}/dashboard`, { cache: "no-store" });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `API menjawab ${r.status}`);
    const d = await r.json();
    lastOk = new Date();
    $("banner").hidden = true;
    render(d);
    if (focusRange !== "2h") loadTrend();
  } catch (e) {
    if (!data) return useSample(`API tidak terhubung (${e.message}).`);
    $("banner").hidden = false;
    $("banner").textContent = `Koneksi ke API terputus (${e.message}). Data di layar dari pukul ${hhmm(lastOk)}. Dasbor mencoba lagi tiap 5 detik.`;
  }
}

async function loadTrend() {
  if (focusRange === "2h" || sampleMode) return renderFocus(data);
  const r = await fetch(`/api/lines/${line}/zones/${data.focus.zone}/trend?range=${focusRange}`);
  if (r.ok) renderFocus(data, (await r.json()).points);
}

function useSample(reason) {
  sampleMode = true;
  $("banner").hidden = false;
  $("banner").textContent = `Menampilkan data contoh karena ${reason} Jalankan docker compose up -d di folder proyek 02, lalu buka http://localhost:18020.`;
  render(sample(line));
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.line && b.dataset.line !== line) {
    line = b.dataset.line;
    document.querySelectorAll("[data-line]").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
    focusRange = "2h";
    load();
  } else if (b.dataset.range) {
    focusRange = b.dataset.range;
    loadTrend();
  }
});
addEventListener("resize", () => data && render(data));

if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";
if (!ONLINE) useSample("dasbor dibuka langsung sebagai file, bukan lewat server.");
else { load(); setInterval(load, POLL_MS); }
