// Pustaka grafik bersama semua situs: data contoh deterministik, format angka Indonesia,
// grafik SVG ringan dengan hover. Warna & huruf diambil dari variabel CSS situs masing-masing:
// --s1 --s2 --s3 (seri), --grid, --ink, --ink-2, --ink-3, --surface, --crit, --warn, --font-mono.
// Semua angka di mockup adalah DATA CONTOH; ganti dengan sumber nyata (MQTT/REST) saat implementasi.

const NOW = new Date(2026, 10, 5, 14, 32);
// Tanpa API: dibuka dari berkas, atau ?pratinjau (galeri/situs statis). Dipakai app.js tiap proyek.
const TANPA_API = location.protocol === "file:" || new URLSearchParams(location.search).has("pratinjau");
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}.${pad(d.getMinutes())}`;
// angka gaya Indonesia: koma desimal, titik ribuan
const fmt = (v, d = 1, fixed = true) => v.toLocaleString("id-ID", { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });

// PRNG deterministik supaya mockup sama tiap dibuka
function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
// deret: base + gelombang harian + derau
function gen(n, { base = 0, amp = 1, noise = 0.3, seed = 1, period = n, drift = 0 } = {}) {
  const r = rng(seed);
  let walk = 0;
  return Array.from({ length: n }, (_, i) => {
    walk = walk * 0.8 + (r() - 0.5) * noise;
    return +(base + amp * Math.sin((i / period) * Math.PI * 2 - 1.6) + walk + drift * i).toFixed(2);
  });
}
const times = (n, stepMin) => Array.from({ length: n }, (_, i) => new Date(NOW - (n - 1 - i) * stepMin * 60000));

const ICON = {
  ok: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="currentColor"/><path d="M3.5 6.2l1.7 1.6L8.6 4.3" stroke="var(--surface)" stroke-width="1.5" fill="none"/></svg>',
  warn: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l5.4 10H.6z" fill="currentColor"/><path d="M6 4.3v3M6 8.6v.9" stroke="var(--surface)" stroke-width="1.4"/></svg>',
  serious: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .5l5.5 5.5L6 11.5.5 6z" fill="currentColor"/><path d="M6 3.5v3.2M6 7.9v.9" stroke="var(--surface)" stroke-width="1.4"/></svg>',
  crit: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.6.5h4.8l3.1 3.1v4.8l-3.1 3.1H3.6L.5 8.4V3.6z" fill="currentColor"/><path d="M4 4l4 4M8 4l-4 4" stroke="var(--surface)" stroke-width="1.4"/></svg>',
  off: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 9l6-6" stroke="currentColor" stroke-width="1.5"/></svg>',
};
const LABEL = { ok: "Normal", warn: "Peringatan", serious: "Tinggi", crit: "Kritis", off: "Offline" };
const st = (k, text = LABEL[k]) => `<span class="st ${k}">${ICON[k]}${text}</span>`;

// Grafik garis: satu sumbu Y, garis 2px, ambang batas putus-putus, crosshair + tooltip
function lineChart(el, { series, x, h = 220, unit = "", min, max, bands = [], fmtX = hhmm, dec = 1, ticks = 4, marks = [] }) {
  const W = el.clientWidth || 600, H = h, L = 44, R = 12, T = 10, B = 24;
  const all = series.flatMap((s) => s.data.filter((v) => v != null)).concat(bands.map((b) => b.y));
  const lo = min ?? Math.floor(Math.min(...all)), hi = max ?? Math.ceil(Math.max(...all));
  const n = x.length;
  const sx = (i) => L + (i / (n - 1)) * (W - L - R);
  const sy = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let g = "";
  for (let k = 0; k <= ticks; k++) {
    const v = lo + ((hi - lo) * k) / ticks, y = sy(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${fmt(v, dec, false)}</text>`;
  }
  const xs = 6;
  for (let k = 0; k < xs; k++) {
    const i = Math.round((k / (xs - 1)) * (n - 1));
    g += `<text x="${sx(i)}" y="${H - 6}" text-anchor="${k === 0 ? "start" : k === xs - 1 ? "end" : "middle"}">${fmtX(x[i])}</text>`;
  }
  for (const b of bands) {
    g += `<line x1="${L}" x2="${W - R}" y1="${sy(b.y)}" y2="${sy(b.y)}" stroke="${b.color}" stroke-width="1.5" stroke-dasharray="5 4"/>
          <text x="${W - R}" y="${sy(b.y) - 5}" text-anchor="end" style="fill:var(--ink-2)">${b.label}</text>`;
  }
  for (const m of marks) {
    g += `<line x1="${sx(m.i)}" x2="${sx(m.i)}" y1="${T}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="2 3"/>
          <text x="${sx(m.i) > W * 0.7 ? sx(m.i) - 5 : sx(m.i) + 5}" y="${T + 10}" text-anchor="${sx(m.i) > W * 0.7 ? "end" : "start"}" style="fill:var(--ink-2)">${m.label}</text>`;
  }
  for (const s of series) {
    let d = "", pen = false;
    s.data.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`;
      pen = true;
    });
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  el.classList.add("chart");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${el.dataset.label || "Grafik"}">${g}
    <line class="xh" y1="${T}" y2="${H - B}" stroke="var(--ink-2)" opacity="0"/></svg><div class="tip"></div>`;
  const svg = el.querySelector("svg"), tip = el.querySelector(".tip"), xh = el.querySelector(".xh");
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
    xh.setAttribute("x1", sx(i)); xh.setAttribute("x2", sx(i)); xh.setAttribute("opacity", 1);
    tip.innerHTML = `${fmtX(x[i])}<br>` + series.map((s) => `${series.length > 1 ? s.name + " " : ""}${s.data[i] == null ? "tidak ada data" : fmt(s.data[i], dec) + " " + unit}`).join("<br>");
    tip.style.left = (sx(i) / W) * r.width + "px";
    tip.style.top = (T / H) * r.height + 8 + "px";
    tip.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; xh.setAttribute("opacity", 0); });
}

// Grafik batang vertikal (mis. kWh per jam): ujung membulat 3px, celah antar batang
function barChart(el, { data, x, h = 200, unit = "", color = "var(--s1)", fmtX = (v) => v, dec = 0, hiIdx = [] }) {
  const W = el.clientWidth || 600, H = h, L = 44, R = 8, T = 10, B = 24;
  // sumbu bulat: 4 langkah dengan step 1/2/2,5/5 x 10^n
  const raw = (Math.max(...data) * 1.05) / 4, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw), hi = step * 4;
  const n = data.length, bw = (W - L - R) / n;
  const sy = (v) => T + (1 - v / hi) * (H - T - B);
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (hi * k) / 4, y = sy(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${fmt(v, dec ? 2 : 0, false)}</text>`;
  }
  data.forEach((v, i) => {
    const x0 = L + i * bw + 1, w = Math.max(1, bw - 2), y = sy(v), hh = H - B - y;
    const r = Math.min(3, w / 2);
    g += `<path data-i="${i}" d="M${x0},${H - B}V${y + r}q0,-${r} ${r},-${r}h${w - 2 * r}q${r},0 ${r},${r}V${H - B}z" fill="${hiIdx.includes(i) ? "var(--s2)" : color}"/>`;
    if (i % Math.ceil(n / 8) === 0) g += `<text x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">${fmtX(x[i])}</text>`;
  });
  el.classList.add("chart");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${el.dataset.label || "Grafik batang"}">${g}</svg><div class="tip"></div>`;
  const svg = el.querySelector("svg"), tip = el.querySelector(".tip");
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const i = Math.floor((((e.clientX - r.left) / r.width) * W - L) / bw);
    if (i < 0 || i >= n) return (tip.style.opacity = 0);
    tip.innerHTML = `${fmtX(x[i])}<br>${fmt(data[i], dec)} ${unit}`;
    tip.style.left = ((L + (i + 0.5) * bw) / W) * r.width + "px";
    tip.style.top = (sy(data[i]) / H) * r.height + "px";
    tip.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => (tip.style.opacity = 0));
}

// Pita status 24 jam: 96 sel × 15 menit; events = [[mulai, panjang, kelas]]
function strip(name, events, now, seed) {
  const cells = Array(96).fill("");
  for (const [a, len, c] of events) for (let i = a; i < a + len && i < 96; i++) cells[i] = c;
  return `<div class="strip"><div><b style="font-weight:500">${name}</b></div>
    <div class="cells" role="img" aria-label="Status 24 jam ${name}">${cells.map((c) => `<span class="${c}"></span>`).join("")}</div>
    <div>${now}</div></div>`;
}

document.documentElement.classList.add("js");

// Mode pratinjau untuk demo ke klien: buka index.html?pratinjau. Pita galat koneksi (#banner/#pita)
// disembunyikan dan diganti label netral, karena di pratinjau API memang sengaja tidak dijalankan.
if (new URLSearchParams(location.search).has("pratinjau")) {
  document.documentElement.classList.add("pratinjau");
  const gaya = document.createElement("style");
  gaya.textContent = `.pratinjau #banner, .pratinjau #pita { display: none !important; }
    .pratinjau-label { position: fixed; right: 16px; bottom: 16px; z-index: 50; padding: 6px 12px; border-radius: 6px;
      background: #171717; color: #fafafa; font: 500 12px/1.4 system-ui, sans-serif; pointer-events: none; }`;
  document.head.append(gaya);
  addEventListener("DOMContentLoaded", () => {
    const l = document.createElement("div");
    l.className = "pratinjau-label";
    l.textContent = "Pratinjau · data dummy, tidak terhubung ke API";
    document.body.append(l);
  });
}
