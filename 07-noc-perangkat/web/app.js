// Dasbor NOC: menarik data dari Prometheus lewat proxy nginx /prom/api/v1 (PromQL HTTP API).
// Dibuka tanpa server (file://) atau Prometheus mati: memakai data contoh bawaan + pita penjelasan.
const API = "/prom/api/v1";
const STALE = 300; // detik, sama dengan aturan alert SensorTidakMengirim
const REFRESH = 15000; // sama dengan scrape_interval
const URUT_GW = ["GW-L1", "GW-L2", "GW-PR", "GW-UT", "GW-GD", "LoRa"];
let model = null;
let tampilSemua = false;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const jam = (epoch) => hhmm(new Date(epoch * 1000));

function durasi(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec} detik`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} jam ${m % 60} menit` : `${h} jam`;
  return h % 24 ? `${Math.floor(h / 24)} hari ${h % 24} jam` : `${Math.floor(h / 24)} hari`;
}
const lalu = (sec) => (sec < 2 ? "baru saja" : `${durasi(sec)} lalu`);
const persen = (v) => `${fmt(v, 0)}<span class="u">&thinsp;%</span>`;
const idf = (s) => `<span class="mono">${esc(s)}</span>`;
const nw = (s) => `<span class="nw">${esc(s)}</span>`;

async function ambil(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} dari ${url.split("?")[0]}`);
  const j = await r.json();
  if (j.status !== "success") throw new Error(j.error || "jawaban Prometheus tidak valid");
  return j.data;
}
const q = async (expr) => (await ambil(`${API}/query?query=${encodeURIComponent(expr)}`)).result;

async function muatProm() {
  const end = Math.floor(Date.now() / 1000);
  const [gwinfo, up, upt, info, seen, batt, crc, latest, al, range] = await Promise.all([
    q("noc_gateway_info"), q("noc_gateway_up"), q("noc_gateway_uptime_seconds"), q("noc_sensor_info"),
    q("time() - noc_sensor_last_seen_timestamp_seconds"), q("noc_sensor_battery_percent"),
    q("rate(noc_sensor_crc_errors_total[5m])"), q("noc_firmware_latest_info"),
    ambil(`${API}/alerts`).then((d) => d.alerts),
    // max by(gateway) menyatukan seri backfill dan seri live yang labelnya bisa berbeda
    ambil(`${API}/query_range?query=${encodeURIComponent("sum(max by (gateway) (noc_gateway_sensors_online))")}&start=${end - 86400}&end=${end}&step=300`).then((d) => d.result),
  ]);
  const peta = (res, key) => Object.fromEntries(res.map((r) => [r.metric[key], +r.value[1]]));
  const upM = peta(up, "gateway"), uptM = peta(upt, "gateway"), seenM = peta(seen, "sensor"), battM = peta(batt, "sensor"), crcM = peta(crc, "sensor");
  const sensors = info.map(({ metric: m }) => ({
    id: m.sensor, gw: m.gateway, jenis: m.type, lokasi: m.location, fw: m.firmware,
    age: seenM[m.sensor] ?? Infinity, baterai: battM[m.sensor], crc: crcM[m.sensor] ?? 0,
  }));
  const gateways = gwinfo.map(({ metric: m }) => ({ id: m.gateway, area: m.area, proto: m.protocol, up: upM[m.gateway] === 1, uptime: uptM[m.gateway] ?? 0 }));
  const seri = range[0]?.values ?? [];
  return {
    t: end, gateways, sensors, alerts: al, latest: latest[0]?.metric.version ?? "-",
    hist: { x: seri.map(([t]) => new Date(t * 1000)), y: seri.map(([, v]) => +v) },
  };
}

// Data contoh untuk mode tanpa API; skenarionya sama dengan simulator/exporter.py.
function contoh() {
  const t = Math.floor(Date.now() / 1000), r = rng(7);
  const G = [["GW-L1", "SMT Line 1", "Modbus RTU", 64, 41 * 86400], ["GW-L2", "SMT Line 2", "Modbus RTU", 71, 11 * 3600],
    ["GW-PR", "Perakitan TV & kulkas", "Modbus RTU", 88, 41 * 86400], ["GW-UT", "Kompresor & utilitas", "Modbus TCP", 52, 41 * 86400],
    ["GW-GD", "Gudang", "Modbus TCP", 17, 0], ["LoRa", "Nirkabel seluruh pabrik", "LoRaWAN", 126, 41 * 86400]];
  const J = { TH: "Suhu & kelembapan", TC: "Termokopel", VB: "Getaran", PM: "Power meter", DS: "Sensor pintu" };
  const sensors = [];
  for (const [id, area, , n] of G) for (let i = 0; i < n; i++) {
    const kode = id === "LoRa" ? "LR" : id.slice(3), tipe = ["TH", "TC", "VB", "PM", "DS"][i % 5], lora = id === "LoRa";
    sensors.push({ id: `${tipe}-${kode}-${pad(i + 1)}`, gw: id, jenis: J[tipe], lokasi: `${area}, titik ${i + 1}`, fw: "2.4.1",
      age: r() * (lora ? 60 : 5), baterai: lora ? 24 + r() * 76 : undefined, crc: 0 });
  }
  sensors.filter((s) => s.gw === "GW-GD").forEach((s, i) => { s.age = 30000 + i; });
  Object.assign(sensors.filter((s) => s.gw === "GW-PR")[5], { id: "VB-CV-TV", jenis: "Getaran", age: 7200, crc: 0.2 });
  const lr = sensors.filter((s) => s.gw === "LoRa");
  Object.assign(lr[0], { id: "TH-PK-14", baterai: 3, age: 2700 });
  [8, 11, 13, 14, 16, 17, 18, 19].forEach((b, i) => { lr[i + 1].baterai = b; });
  [3, 5, 8, 20].forEach((i) => { lr[i].fw = "2.3.8"; });
  const x = Array.from({ length: 289 }, (_, i) => new Date((t - (288 - i) * 300) * 1000));
  const y = x.map((d) => {
    const ago = t - d / 1000;
    let v = 418;
    if (ago < 30000) v -= 17;
    if (ago < 7200) v -= 1;
    if (ago < 2700) v -= 1;
    if (ago > 39600 && ago < 40200) v -= 71;
    return v;
  });
  const sejak = (s) => new Date((t - s) * 1000).toISOString();
  const alerts = [
    { labels: { alertname: "GatewayPutus", severity: "kritis", gateway: "GW-GD" }, annotations: { ringkasan: "Gateway GW-GD tidak terhubung ke kolektor" }, state: "firing", activeAt: sejak(29880) },
    { labels: { alertname: "SensorTidakMengirim", severity: "kritis", sensor: "VB-CV-TV" }, annotations: { ringkasan: "Sensor VB-CV-TV tidak mengirim data lebih dari 5 menit" }, state: "firing", activeAt: sejak(6840) },
    { labels: { alertname: "GalatCRCBeruntun", severity: "peringatan", sensor: "VB-CV-TV" }, annotations: { ringkasan: "Error CRC Modbus beruntun pada VB-CV-TV" }, state: "firing", activeAt: sejak(6900) },
    { labels: { alertname: "SensorTidakMengirim", severity: "kritis", sensor: "TH-PK-14" }, annotations: { ringkasan: "Sensor TH-PK-14 tidak mengirim data lebih dari 5 menit" }, state: "firing", activeAt: sejak(2340) },
  ];
  return {
    t, sensors, alerts, latest: "2.4.1", hist: { x, y },
    gateways: G.map(([id, area, proto, , up0]) => ({ id, area, proto, up: id !== "GW-GD", uptime: up0 })),
  };
}

function penyebab(s, gw) {
  if (gw && !gw.up) return `Gateway ${idf(s.gw)} putus dari jaringan`;
  if (s.crc > 0) return "Kabel RS485 bermasalah, error CRC beruntun";
  if (s.baterai != null && s.baterai < 5) return `Baterai habis (${fmt(s.baterai, 0)}&thinsp;%)`;
  return "Belum diketahui. Periksa sensor di lokasi.";
}

function sel(age, t) {
  const sejak = t - age;
  return `<span class="beat dead" aria-hidden="true"></span><span class="age" data-sejak="${sejak}">${lalu(age)}</span><span class="when">pukul ${jam(sejak)}</span>`;
}

function render(m) {
  const gwM = Object.fromEntries(m.gateways.map((g) => [g.id, g]));
  m.gateways.sort((a, b) => (URUT_GW.indexOf(a.id) + 99) % 99 - (URUT_GW.indexOf(b.id) + 99) % 99);
  const off = m.sensors.filter((s) => s.age >= STALE).sort((a, b) => b.age - a.age);
  const down = m.gateways.filter((g) => !g.up);
  const lora = m.sensors.filter((s) => s.baterai != null);
  const low = lora.filter((s) => s.baterai < 20).sort((a, b) => a.baterai - b.baterai);
  const usang = m.sensors.filter((s) => s.fw !== m.latest);

  // temuan
  const gDown = down.map((g) => ({ g, n: off.filter((s) => s.gw === g.id), sejak: m.t - Math.max(...off.filter((s) => s.gw === g.id).map((s) => s.age), 0) }));
  const utama = gDown.sort((a, b) => b.n.length - a.n.length)[0];
  if (!off.length) {
    $("temuan").innerHTML = `<b>Semua ${m.sensors.length} sensor mengirim data.</b> Tidak ada yang perlu dipulihkan.`;
  } else {
    let t = `<b>Sebanyak ${off.length} sensor tidak mengirim data.</b>`;
    if (utama && utama.n.length) {
      const g = utama.g.id;
      t += utama.n.length === off.length
        ? ` Semuanya terhubung lewat ${nw(g)}, yang putus sejak pukul ${jam(utama.sejak)}. Pulihkan ${nw(g)} lebih dulu.`
        : ` ${nw(g)} putus sejak pukul ${jam(utama.sejak)} dan ${utama.n.length} di antaranya terhubung lewat gateway itu. Pulihkan ${nw(g)} lebih dulu.`;
    }
    $("temuan").innerHTML = t;
  }
  const fokus = $("fokus");
  fokus.disabled = !off.length;
  fokus.textContent = utama && utama.n.length ? `Lihat ${utama.n.length} sensor di ${utama.g.id}` : "Lihat daftar sensor";

  // KPI
  $("k-off").textContent = off.length;
  $("k-off-d").textContent = `dari ${m.sensors.length} sensor`;
  $("k-gw").innerHTML = `${m.gateways.length - down.length}<span class="u">dari ${m.gateways.length}</span>`;
  $("k-gw-d").textContent = down.length ? `${down.map((g) => g.id).join(", ")} putus` : "Semua terhubung";
  $("k-bat").textContent = low.length;
  $("k-fw").textContent = usang.length;
  $("k-fw-d").textContent = `Versi terbaru ${m.latest}`;
  $("nav-off").textContent = off.length || "";

  topologi(m, gwM);

  // tabel sensor tidak mengirim data: sensor di belakang gateway putus dijadikan satu grup
  let rows = "";
  for (const { g, n, sejak } of gDown) {
    if (!n.length) continue;
    rows += `<tr class="group"><td colspan="4"><b>${n.length} sensor lewat ${idf(g.id)}</b> <span class="muted">${esc(g.area)}</span>
      <button class="btn link" type="button" data-toggle aria-expanded="${tampilSemua}">${tampilSemua ? "Sembunyikan" : "Tampilkan"}</button></td>
      <td>${sel(m.t - sejak, m.t)}</td><td>Gateway ${idf(g.id)} putus dari jaringan</td></tr>`;
    rows += n.map((s) => baris(s, gwM, m.t, !tampilSemua)).join("");
  }
  rows += off.filter((s) => gwM[s.gw]?.up).map((s) => baris(s, gwM, m.t, false)).join("");
  $("t-off").innerHTML = rows || `<tr><td colspan="6" class="empty">Semua sensor mengirim data dalam 5 menit terakhir.</td></tr>`;

  // gateway
  $("t-gw").innerHTML = m.gateways.map((g) => {
    const ss = m.sensors.filter((s) => s.gw === g.id), on = ss.filter((s) => s.age < STALE).length;
    const sejak = m.t - Math.max(...ss.map((s) => s.age));
    return `<tr><td class="id">${idf(g.id)}<span class="sub">${esc(g.proto)}</span></td><td class="n">${on}<span class="u">&thinsp;/&thinsp;${ss.length}</span></td>
      <td class="n">${g.up ? durasi(g.uptime) : `<span class="muted">Putus</span>`}</td><td>${g.up ? st("ok", "Terhubung") : st("crit", `Putus sejak ${jam(sejak)}`)}</td></tr>`;
  }).join("");

  // riwayat
  const { x, y } = m.hist;
  $("riwayat-sub").textContent = `Jumlah per 5 menit, dari ${m.sensors.length} sensor`;
  if (y.length > 1) {
    const lo = Math.floor((Math.min(...y) - 20) / 40) * 40;
    // tandai hanya penurunan yang belum pulih: itulah yang masih perlu ditangani
    const akhir = y[y.length - 1];
    const turun = y.map((v, i) => ({ i, v, d: i ? y[i - 1] - v : 0 })).filter((o) => o.d >= 10 && akhir <= o.v).sort((a, b) => b.d - a.d).slice(0, 1);
    lineChart($("c-online"), {
      x, series: [{ name: "Mengirim data", color: "var(--s1)", data: y }], unit: "sensor", dec: 0, h: (w => w < 600 ? 260 : w < 1000 ? 400 : 320)($("c-online").clientWidth),
      min: lo, max: lo + Math.ceil((Math.max(...y) + 40 - lo) / 160) * 160, // 4 langkah kelipatan 40
      marks: $("c-online").clientWidth > 600 ? turun.map((o) => ({ i: o.i, label: `Turun ${o.d}, belum pulih` })) : [],
    });
  } else {
    $("c-online").innerHTML = `<p class="empty">Riwayat belum tersedia karena Prometheus baru menyala. Grafik terisi setelah beberapa menit.</p>`;
  }

  // alert
  const al = [...m.alerts].sort((a, b) => (a.state === "firing" ? 0 : 1) - (b.state === "firing" ? 0 : 1) || (a.labels.severity === "kritis" ? 0 : 1) - (b.labels.severity === "kritis" ? 0 : 1));
  $("nav-alert").textContent = al.length || "";
  $("l-alert").innerHTML = al.length ? `<ul class="alerts">${al.slice(0, 6).map((a) => `<li>
      <span class="ts">${hhmm(new Date(a.activeAt))}</span>
      <div>${st(a.labels.severity === "kritis" ? "crit" : "warn", a.labels.severity === "kritis" ? "Kritis" : "Peringatan")}</div>
      <div class="msg">${esc(a.annotations.ringkasan || a.labels.alertname)}</div>
      <div class="meta">${a.state === "firing" ? "Aktif" : "Menunggu"}, aturan <span class="mono">${esc(a.labels.alertname)}</span></div></li>`).join("")}</ul>
      ${al.length > 6 ? `<p class="more">Masih ada ${al.length - 6} alert lain. Buka Prometheus untuk melihat semuanya.</p>` : ""}`
    : `<p class="empty">Tidak ada alert aktif.</p>`;

  // baterai
  const bat = [...lora].sort((a, b) => a.baterai - b.baterai).slice(0, 9);
  $("bat-sub").textContent = `${bat.length} terendah dari ${lora.length} sensor nirkabel`;
  $("l-bat").innerHTML = bat.length ? bat.map((s) => `<div class="hbar">${idf(s.id)}
    <div class="track"><div class="fill" style="width:${Math.max(2, s.baterai)}%;background:${s.baterai < 10 ? "var(--crit)" : s.baterai < 20 ? "var(--warn)" : "var(--s1)"}"></div></div>
    <span class="val">${persen(s.baterai)}</span></div>`).join("") : `<p class="empty">Tidak ada sensor nirkabel yang melaporkan baterai.</p>`;

  // firmware
  $("fw-sub").textContent = `Versi terbaru ${m.latest}`;
  $("l-fw").innerHTML = usang.length
    ? `<table><thead><tr><th>Sensor</th><th>Versi terpasang</th><th>Gateway</th><th>Lokasi</th></tr></thead><tbody>
      ${usang.map((s) => `<tr><td class="id">${idf(s.id)}</td><td>${esc(s.fw)}</td><td>${idf(s.gw)}</td><td>${esc(s.lokasi)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="empty">Semua ${m.sensors.length} sensor sudah memakai firmware ${m.latest}.</p>`;
}

function baris(s, gwM, t, hidden) {
  return `<tr class="${hidden ? "hidden" : ""}" data-gw="${s.gw}"><td class="id">${idf(s.id)}</td><td>${esc(s.jenis)}</td><td>${esc(s.lokasi)}</td>
    <td>${idf(s.gw)}</td><td>${sel(s.age, t)}</td><td>${penyebab(s, gwM[s.gw])}</td></tr>`;
}

function topologi(m, gwM) {
  const el = $("topo"), W = el.clientWidth || 1200, sempit = W < 900;
  const colW = sempit ? 0 : 140, gwX = sempit ? 0 : 196, gwW = sempit ? Math.min(W, 220) : 220;
  const ageW = sempit ? 0 : 200, sx0 = sempit ? 0 : gwX + gwW + 36, sxEnd = W - ageW - (sempit ? 0 : 28);
  // ukuran port mengikuti lebar: gateway terbesar paling banyak tiga baris
  const maxN = Math.max(...m.gateways.map((g) => m.sensors.filter((s) => s.gw === g.id).length));
  const step = Math.max(12, Math.min(20, Math.floor((sxEnd - sx0) / Math.ceil(maxN / 3)))), SQ = step - 4;
  const perRow = Math.max(8, Math.floor((sxEnd - sx0 + 4) / step));
  let y = 0;
  const rows = m.gateways.map((g) => {
    const ss = m.sensors.filter((s) => s.gw === g.id), nRow = Math.ceil(ss.length / perRow);
    const h = sempit ? 60 + nRow * step + 8 : Math.max(64, nRow * step + 20);
    const row = { g, ss, y, h, nRow };
    y += h + 12;
    return row;
  });
  const H = y - 12, cy = H / 2;
  let svg = sempit ? "" : `<rect class="node" x="0" y="${cy - 40}" width="${colW}" height="80" rx="4"/>
    <text class="gw-id" x="16" y="${cy - 10}" style="font-family:var(--font-sans);font-weight:600">Kolektor</text><text x="16" y="${cy + 10}">Prometheus</text><text x="16" y="${cy + 28}">tiap 15 detik</text>
    <line class="gutter" x1="${sxEnd + 14}" x2="${sxEnd + 14}" y1="0" y2="${H}"/>`;
  for (const r of rows) {
    const gy = sempit ? r.y + 30 : r.y + r.h / 2, down = !r.g.up, ss = r.ss, on = ss.filter((s) => s.age < STALE).length;
    const segar = down ? Math.max(...ss.map((s) => s.age)) : Math.min(...ss.map((s) => s.age));
    const nodeH = sempit ? 52 : r.h, ty = sempit ? r.y + 26 : gy;
    svg += `${sempit ? "" : `<path class="link${down ? " down" : ""}" d="M${colW},${cy} C${colW + 40},${cy} ${gwX - 40},${gy} ${gwX},${gy}"/>`}
      <rect class="node${down ? " down" : ""}" x="${gwX}" y="${r.y}" width="${gwW}" height="${nodeH}" rx="4"/>
      <circle class="${down ? "led-down" : "led-ok"}" cx="${gwX + 20}" cy="${ty - 9}" r="4"><title>Lampu link ${r.g.id}: ${down ? "mati" : "menyala"}</title></circle>
      <text class="gw-id" x="${gwX + 32}" y="${ty - 4}">${r.g.id}</text><text x="${gwX + 16}" y="${ty + 16}">${esc(r.g.proto)}</text>
      <text class="num${down ? " bad" : ""}" x="${gwX + gwW - 16}" y="${ty - 4}" text-anchor="end">${on} / ${ss.length}</text>
      ${down ? `<text class="bad" x="${gwX + gwW - 16}" y="${ty + 16}" text-anchor="end">Putus</text>` : ""}
      ${sempit ? "" : `<path class="link${down ? " down" : ""}" d="M${gwX + gwW},${gy} H${sx0 - 8}"/>
      <text class="age ${down ? "age-down" : "age-ok"}" x="${sxEnd + 32}" y="${gy - 2}" data-sejak="${m.t - segar}">${lalu(segar)}</text>
      <text x="${sxEnd + 32}" y="${gy + 17}">${down ? "data terakhir sebelum putus" : "data terakhir masuk"}</text>`}`;
    const top = sempit ? r.y + 60 : gy - (r.nRow * step - 4) / 2;
    ss.forEach((s, i) => {
      const x = sx0 + (i % perRow) * step, yy = top + Math.floor(i / perRow) * step;
      const cls = s.age >= STALE ? "s-off" : s.baterai != null && s.baterai < 20 ? "s-low" : "s-on", o = cls === "s-low" ? 0.75 : 0;
      const ket = s.age >= STALE ? `tidak mengirim data selama ${durasi(s.age)}` : `data terakhir ${lalu(s.age)}`;
      svg += `<rect class="${cls}" x="${x + o}" y="${yy + o}" width="${SQ - 2 * o}" height="${SQ - 2 * o}" rx="2"><title>${s.id}, ${esc(s.jenis)}, ${esc(s.lokasi)}: ${ket}${s.baterai != null ? `, baterai ${fmt(s.baterai, 0)}%` : ""}</title></rect>`;
    });
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Topologi ${m.gateways.length} gateway dan ${m.sensors.length} sensor">${svg}</svg>`;
}

function banner(html) {
  const b = $("banner");
  b.hidden = !html;
  b.innerHTML = html || "";
}

function detak(ok) {
  const b = $("beat");
  b.className = `beat ${ok ? "" : "idle"}`;
  if (ok) { void b.offsetWidth; b.classList.add("pulse"); }
}

async function muat() {
  const tanda = document.querySelector("[data-pratinjau]");
  if (PRATINJAU) {
    model = contoh();
    tanda.hidden = false;
    tanda.textContent = "Pratinjau, data contoh";
    $("sinkron").textContent = `Diperbarui pukul ${hhmm(new Date())}.${pad(new Date().getSeconds())}`;
    detak(true);
  } else if (TANPA_API) {
    model = contoh();
    tanda.hidden = false;
    banner(`Halaman dibuka sebagai file, jadi dasbor memakai data contoh. Untuk data nyata, jalankan <code>docker compose -p konsep-07 up -d</code> lalu buka <code>http://localhost:18070</code>.`);
    $("sumber").textContent = "Data contoh bawaan";
    $("sinkron").textContent = "Belum tersambung ke Prometheus";
    detak(false);
  } else {
    try {
      model = await muatProm();
      banner("");
      tanda.hidden = true;
      $("sinkron").textContent = `Diperbarui pukul ${hhmm(new Date())}.${pad(new Date().getSeconds())}`;
      detak(true);
    } catch (e) {
      const isi = model ? "data terakhir yang berhasil dimuat" : "data contoh";
      if (!model) model = contoh();
      tanda.hidden = isi !== "data contoh";
      banner(`Prometheus tidak menjawab (${esc(e.message)}), jadi dasbor menampilkan ${isi}. Periksa <code>docker compose -p konsep-07 ps</code>. Dasbor mencoba lagi tiap 15 detik.`);
      $("sinkron").textContent = "Gagal memperbarui, mencoba lagi";
      detak(false);
    }
  }
  render(model);
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-toggle]")) {
    tampilSemua = !tampilSemua;
    render(model);
  } else if (e.target.id === "fokus") {
    tampilSemua = true;
    render(model);
    $("offline").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
});
// jam "terakhir mengirim data" berjalan tiap detik tanpa menunggu scrape berikutnya
setInterval(() => {
  const now = Date.now() / 1000;
  document.querySelectorAll(".age[data-sejak]").forEach((el) => { el.textContent = lalu(now - +el.dataset.sejak); });
}, 1000);
muat();
if (!TANPA_API) setInterval(muat, REFRESH);
// pratinjau: detak sinkron disimulasikan supaya tanda tangan terlihat bekerja
else if (PRATINJAU) setInterval(() => { detak(true); $("sinkron").textContent = `Diperbarui pukul ${hhmm(new Date())}.${pad(new Date().getSeconds())}`; }, REFRESH);
