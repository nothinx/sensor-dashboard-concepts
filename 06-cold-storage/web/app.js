// Dasbor Gudang & Cold Storage: data awal dari REST (/api/ruang), pembaruan langsung dari MQTT
// over WebSocket (topik gudang/<ruang>/<metrik>, retained). Fallback: polling REST, lalu data contoh.
const LANGSUNG = !TANPA_API;
const MQTT_URL = `ws://${location.hostname || "localhost"}:18062`;
const OFFLINE_MS = 120e3;
const $ = (id) => document.getElementById(id);
const RANK = { ok: 0, off: 1, warn: 2, crit: 3 };

let ruang = [];
let pilih = "cs-b";
let contohAktif = false;
let jadwalRender = 0;

const durasi = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(s / 60); return m ? `${m} mnt ${s % 60} dtk` : `${s} dtk`; };
const nilaiStatus = (v, a) => {
  if (v == null || !a) return "ok";
  const luar = ([lo, hi]) => (lo != null && v < lo) || (hi != null && v > hi);
  return a.k && luar(a.k) ? "crit" : a.w && luar(a.w) ? "warn" : "ok";
};

function status(g) {
  const ts = Object.values(g.ts || {});
  if (!ts.length || Date.now() - Math.max(...ts) > OFFLINE_MS) return { s: "off", teks: ts.length ? `Offline sejak pukul ${hhmm(new Date(Math.max(...ts)))}` : "Belum pernah mengirim data" };
  let s = "ok", teks = "Normal";
  for (const [m, a] of Object.entries(g.metrik)) {
    const k = nilaiStatus(g.nilai[m], a);
    if (RANK[k] > RANK[s]) { s = k; teks = k === "crit" ? "Di luar batas kritis" : "Mendekati batas"; }
  }
  const p = g.pintu_status;
  if (p?.terbuka && g.pintu) {
    const lewat = Date.now() - p.sejak > g.pintu.batas_detik * 1000;
    const k = lewat ? "crit" : "warn";
    if (RANK[k] >= RANK[s]) { s = k; teks = lewat ? "Pintu terbuka melewati batas" : "Pintu terbuka"; }
  }
  return { s, teks };
}

function pintuTeks(g) {
  const p = g.pintu_status;
  if (!g.pintu) return "";
  if (!p) return `<span class="pintu">Status pintu belum ada</span>`;
  if (!p.terbuka) return `<span class="pintu">Pintu tertutup</span>`;
  const lama = Date.now() - p.sejak, sisa = g.pintu.batas_detik * 1000 - lama;
  return sisa > 0
    ? `<span class="pintu buka">Pintu terbuka ${durasi(lama)} · <b>tutup dalam ${durasi(sisa)}</b></span>`
    : `<span class="pintu lewat">Pintu terbuka ${durasi(lama)} · <b>lewat batas ${durasi(-sisa)}</b></span>`;
}

// ---------- kerangka (dibuat sekali, lalu hanya isinya yang diperbarui supaya fokus keyboard tidak hilang)
function kerangka() {
  const kartu = (g, besar) => `<button type="button" class="kartu" data-id="${g.id}" aria-pressed="${g.id === pilih}">
      <span class="k-atas"><span class="k-nama">${g.nama}</span><span class="k-status" data-f="status"></span></span>
      <span class="k-isi">${g.isi}${g.lokasi ? `<br>${g.lokasi}` : ""}</span>
      <span class="k-nilai num" data-f="nilai"></span>
      ${besar ? `<span class="termo" data-f="termo"></span>` : `<span class="rh-bar" data-f="rhbar"></span>`}
      <span data-f="pintu"></span>
    </button>`;
  $("dingin").innerHTML = ruang.filter((g) => g.jenis === "dingin" || g.jenis === "beku").map((g) => kartu(g, true)).join("");
  $("lemari").innerHTML = ruang.filter((g) => g.jenis === "lemari_kering").map((g) => kartu(g, false)).join("");
  $("dingin").removeAttribute("aria-busy"); $("lemari").removeAttribute("aria-busy");
  document.querySelectorAll(".kartu").forEach((b) => b.addEventListener("click", () => { pilih = b.dataset.id; perbarui(); grafik(); }));
}

function termometer(g, v) {
  const a = g.metrik.suhu, lo = a.k[0] - 3, hi = a.k[1] + 3, pos = (x) => `${Math.min(100, Math.max(0, ((x - lo) / (hi - lo)) * 100))}%`;
  return `<span class="termo-track"><span class="termo-aman" style="left:${pos(a.w[0])};right:calc(100% - ${pos(a.w[1])})"></span>
    ${v != null ? `<span class="termo-titik" style="left:${pos(v)}"></span>` : ""}</span>
    <span class="termo-label"><span style="left:${pos(a.w[0])}">${fmt(a.w[0], 0)} °C</span><span style="left:${pos(a.w[1])}">${fmt(a.w[1], 0)} °C</span></span>`;
}

function perbarui() {
  for (const g of ruang) {
    const el = document.querySelector(`.kartu[data-id="${g.id}"]`);
    const { s, teks } = status(g);
    if (!el) continue;
    el.dataset.status = s;
    el.setAttribute("aria-pressed", g.id === pilih);
    const m = Object.keys(g.metrik)[0], v = g.nilai[m];
    el.querySelector('[data-f="status"]').innerHTML = st(s, teks);
    el.querySelector('[data-f="nilai"]').innerHTML = s === "off" ? "tidak ada data" : `${fmt(v, 1)}<span class="u">${g.metrik[m].satuan}</span>`;
    const termo = el.querySelector('[data-f="termo"]');
    if (termo) termo.innerHTML = termometer(g, s === "off" ? null : v);
    const bar = el.querySelector('[data-f="rhbar"]');
    if (bar) bar.innerHTML = `<span class="rh-isi" style="width:${s === "off" ? 0 : Math.min(100, (v / 10) * 100)}%"></span><span class="rh-batas" title="batas 5 %RH"></span>`;
    el.querySelector('[data-f="pintu"]').innerHTML = pintuTeks(g);
  }
  const gd = ruang.find((g) => g.jenis === "gudang");
  if (gd) {
    const { s, teks } = status(gd);
    $("gudang").innerHTML = `<dl class="kv">${Object.entries(gd.metrik).map(([m, a]) => `<div><dt>${m === "suhu" ? "Suhu" : "Kelembapan"}</dt>
      <dd class="num">${gd.nilai[m] != null ? fmt(gd.nilai[m], 1) : "-"}<span class="u">${a.satuan}</span></dd><dd class="sub">batas ${fmt(a.w[1], 0)} ${a.satuan}</dd></div>`).join("")}</dl>${st(s, teks)}`;
  }
  temuan();
}

function temuan() {
  const masalah = ruang.map((g) => ({ g, ...status(g) })).filter((x) => x.s !== "ok").sort((a, b) => RANK[b.s] - RANK[a.s]);
  if (!masalah.length) { $("temuan").innerHTML = "<b>Semua ruang dalam batas dan semua pintu tertutup.</b>"; return; }
  const utama = masalah[0], g = utama.g, p = g.pintu_status;
  let kalimat;
  if (p?.terbuka && g.pintu) {
    const sisa = g.pintu.batas_detik * 1000 - (Date.now() - p.sejak);
    kalimat = `<b>Pintu ${g.nama} terbuka ${durasi(Date.now() - p.sejak)}${sisa > 0 ? `; tutup dalam ${durasi(sisa)}` : `, lewat batas ${durasi(-sisa)}`}.</b>`;
    const m = Object.keys(g.metrik)[0];
    if (g.nilai[m] != null) kalimat += ` Suhu sekarang ${fmt(g.nilai[m], 1)} °C, batas ${fmt(g.metrik[m].w[1], 0)} °C.`;
  } else kalimat = `<b>${g.nama}: ${utama.teks.toLowerCase()}.</b>`;
  const lain = masalah.length - 1;
  $("temuan").innerHTML = kalimat + (lain ? ` ${lain === 1 ? "Satu" : lain} ruang lain perlu dicek: ${masalah.slice(1).map((x) => `${x.g.nama} (${x.teks.toLowerCase()})`).join(", ")}.` : "");
}

// ---------- grafik riwayat ruang terpilih
async function grafik() {
  const g = ruang.find((x) => x.id === pilih);
  const m = Object.keys(g.metrik)[0], a = g.metrik[m];
  $("grafik-sub").textContent = `${g.nama} · ${m === "suhu" ? "suhu" : "kelembapan"} ${a.satuan}, rata-rata 15 menit`;
  const box = $("grafik");
  box.innerHTML = `<p class="memuat">Memuat riwayat…</p>`;
  let deret;
  try {
    if (contohAktif) {
      const x = times(96, 15), base = g.nilai[m] ?? (a.w[0] ?? 0);
      deret = gen(96, { base, amp: Math.abs(base) * 0.03 + 0.2, noise: 0.25, seed: g.id.length * 7 }).map((v, i) => ({ ts: x[i], v }));
    } else {
      const r = await fetch(`/api/riwayat?ruang=${encodeURIComponent(g.id)}&metrik=${m}&jam=24&langkah=15`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.galat || `HTTP ${r.status}`);
      deret = j.deret.map((d) => ({ ts: new Date(d.ts), v: d.v }));
    }
  } catch (e) {
    box.innerHTML = `<p class="galat">Riwayat gagal dimuat (${e.message}). Pilih ruang lagi beberapa saat kemudian.</p>`;
    return;
  }
  if (pilih !== g.id) return;
  if (!deret.length) { box.innerHTML = `<p class="kosong">Belum ada riwayat untuk ${g.nama}. Riwayat muncul setelah sensor mengirim data.</p>`; return; }
  box.innerHTML = `<div id="g-utama" data-label="${g.nama} 24 jam"></div>`;
  const bands = [];
  a.w.forEach((v, i) => v != null && bands.push({ y: v, label: `${i ? "maks" : "min"} ${fmt(v, 0)}`, color: "var(--warn)" }));
  const vals = deret.map((d) => d.v).concat(bands.map((b) => b.y));
  lineChart($("g-utama"), { x: deret.map((d) => d.ts), series: [{ name: g.nama, color: "var(--s1)", data: deret.map((d) => d.v) }],
    unit: a.satuan, dec: 1, h: 240, bands, min: Math.floor(Math.min(...vals) - 1), max: Math.ceil(Math.max(...vals) + 1) });
}

// ---------- data & koneksi
const koneksi = (teks, k) => { $("koneksi").textContent = teks; $("koneksi").className = `koneksi ${k}`; };
const pita = (teks) => { $("pita").hidden = !teks; $("pita").textContent = teks || ""; };
function jadwalkan() { if (!jadwalRender) jadwalRender = requestAnimationFrame(() => { jadwalRender = 0; perbarui(); }); }

async function ambilRuang() {
  const r = await fetch("/api/ruang");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()).ruang;
}

function sambungMqtt() {
  if (typeof mqtt === "undefined") return pollingSaja("Pustaka MQTT tidak termuat (CDN tidak terjangkau)");
  const c = mqtt.connect(MQTT_URL, { reconnectPeriod: 3000, connectTimeout: 5000, clientId: `dasbor-${Math.random().toString(16).slice(2, 8)}` });
  c.on("connect", () => { pita(""); koneksi("Langsung lewat MQTT", "hidup"); c.subscribe("gudang/+/+"); });
  c.on("reconnect", () => koneksi("Menyambung ulang ke broker…", "putus"));
  c.on("error", (e) => pita(`Broker MQTT menolak koneksi (${e.message}). Nilai di layar mungkin tidak terbaru.`));
  c.on("message", (topic, buf) => {
    const [, id, m] = topic.split("/");
    const g = ruang.find((x) => x.id === id);
    if (!g) return;
    try {
      const d = JSON.parse(buf.toString());
      if (m === "pintu") g.pintu_status = { terbuka: d.terbuka, sejak: d.sejak };
      else { g.nilai[m] = d.v; g.ts[m] = d.ts; }
      jadwalkan();
    } catch { /* pesan rusak diabaikan */ }
  });
  // bila broker tak tersambung dalam 8 detik, ambil data lewat REST secara berkala
  setTimeout(() => { if (!c.connected) pollingSaja("Broker MQTT di port 18062 tidak menjawab"); }, 8000);
}

function pollingSaja(sebab) {
  pita(`${sebab}. Data diambil lewat API setiap 10 detik.`);
  koneksi("Polling API", "putus");
  setInterval(async () => { try { ruang = await ambilRuang(); jadwalkan(); } catch { koneksi("API tidak menjawab", "putus"); } }, 10e3);
}

function modeContoh(pesan) {
  contohAktif = true;
  pita(pesan);
  koneksi("Mode data contoh", "putus");
  const c = window.CONTOH_RUANG, geser = Date.now() - c.ts;
  ruang = c.ruang.map((g) => ({ ...g, ts: Object.fromEntries(Object.entries(g.ts).map(([k, v]) => [k, v + geser])),
    pintu_status: g.pintu_status && { ...g.pintu_status, sejak: g.pintu_status.sejak + geser } }));
}

async function mulai() {
  if (!LANGSUNG) modeContoh("Mode data contoh: API tidak terhubung karena dasbor dibuka langsung dari berkas. Jalankan docker compose lalu buka http://localhost:18060.");
  else {
    try { ruang = await ambilRuang(); sambungMqtt(); }
    catch (e) { modeContoh(`Mode data contoh: API tidak terhubung (${e.message}). Periksa layanan dengan docker compose -p konsep-06 ps.`); }
  }
  kerangka();
  perbarui();
  grafik();
  setInterval(perbarui, 1000); // hitung mundur pintu
  if (!contohAktif) setInterval(grafik, 60e3);
}

mulai();
