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

// durasi ditulis lengkap ("1 menit 20 detik"), angka dan satuan tidak boleh terpisah baris
const durasi = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(s / 60); return m ? `${m}&nbsp;menit ${s % 60}&nbsp;detik` : `${s}&nbsp;detik`; };
const satuan = (u) => `<span class="u">&thinsp;${u}</span>`;
const nilaiStatus = (v, a) => {
  if (v == null || !a) return "ok";
  const luar = ([lo, hi]) => (lo != null && v < lo) || (hi != null && v > hi);
  return a.k && luar(a.k) ? "crit" : a.w && luar(a.w) ? "warn" : "ok";
};

function status(g) {
  const ts = Object.values(g.ts || {});
  if (!ts.length || Date.now() - Math.max(...ts) > OFFLINE_MS) return { s: "off", teks: ts.length ? `Terputus sejak ${hhmm(new Date(Math.max(...ts)))}` : "Belum ada data" };
  let s = "ok", teks = "Normal";
  for (const [m, a] of Object.entries(g.metrik)) {
    const k = nilaiStatus(g.nilai[m], a);
    if (RANK[k] > RANK[s]) { s = k; teks = k === "crit" ? "Di luar batas" : "Mendekati batas"; }
  }
  const p = g.pintu_status;
  if (p?.terbuka && g.pintu) {
    const lewat = Date.now() - p.sejak > g.pintu.batas_detik * 1000;
    const k = lewat ? "crit" : "warn";
    if (RANK[k] >= RANK[s]) { s = k; teks = lewat ? "Pintu lewat batas" : "Pintu terbuka"; }
  }
  return { s, teks };
}

// blok pintu selalu berstruktur sama (keterangan + nilai) supaya tinggi kartu tidak melompat antar state
function pintuTeks(g) {
  const p = g.pintu_status;
  if (!g.pintu) return "";
  if (!p) return `<span class="pintu"><span class="p-lbl">Pintu</span><b>Belum ada status</b></span>`;
  if (!p.terbuka) return `<span class="pintu"><span class="p-lbl">Pintu</span><b>Tertutup</b></span>`;
  const lama = Date.now() - p.sejak, sisa = g.pintu.batas_detik * 1000 - lama;
  return sisa > 0
    ? `<span class="pintu buka"><span class="p-lbl">Terbuka ${durasi(lama)}, tutup dalam</span><b>${durasi(sisa)}</b></span>`
    : `<span class="pintu lewat"><span class="p-lbl">Terbuka ${durasi(lama)}, lewat batas</span><b>${durasi(-sisa)}</b></span>`;
}

// ---------- kerangka (dibuat sekali, lalu hanya isinya yang diperbarui supaya fokus keyboard tidak hilang)
function kerangka() {
  // kartu = label pintu/rak: kode ruang terbalik di kiri atas, seperti label bernomor di gudang.
  // Lemari kering: kode sudah menyebut lemarinya, jadi judul kartu = isinya, keterangan = lokasinya.
  const kartu = (g, besar) => `<button type="button" class="kartu" data-id="${g.id}" aria-pressed="${g.id === pilih}">
      <span class="tirai" aria-hidden="true"></span>
      <span class="k-atas"><span class="k-kode">${g.id.toUpperCase()}</span><span class="k-status" data-f="status"></span></span>
      <span class="k-nama">${besar ? g.nama : g.isi}</span>
      <span class="k-isi">${besar ? g.isi : g.lokasi || ""}</span>
      <span class="k-nilai" data-f="nilai"></span>
      ${besar ? `<span class="termo" data-f="termo"></span>` : `<span class="rh-bar" data-f="rhbar"></span>`}
      <span class="k-pintu" data-f="pintu"></span>
    </button>`;
  $("dingin").innerHTML = ruang.filter((g) => g.jenis === "dingin" || g.jenis === "beku").map((g) => kartu(g, true)).join("");
  $("lemari").innerHTML = ruang.filter((g) => g.jenis === "lemari_kering").map((g) => kartu(g, false)).join("");
  $("dingin").removeAttribute("aria-busy"); $("lemari").removeAttribute("aria-busy");
  document.querySelectorAll(".kartu").forEach((b) => b.addEventListener("click", () => { pilih = b.dataset.id; perbarui(); grafik(); }));
}

function termometer(g, v) {
  const a = g.metrik.suhu, lo = a.k[0] - 3, hi = a.k[1] + 3, pos = (x) => `${Math.min(100, Math.max(0, ((x - lo) / (hi - lo)) * 100))}%`;
  return `<span class="termo-track"><span class="termo-bola"></span><span class="termo-aman" style="left:${pos(a.w[0])};right:calc(100% - ${pos(a.w[1])})"></span>
    ${v != null ? `<span class="termo-titik" style="left:${pos(v)}"></span>` : ""}</span>
    <span class="termo-label"><span style="left:${pos(a.w[0])}">${fmt(a.w[0], 0)}&nbsp;°C</span><span style="left:${pos(a.w[1])}">${fmt(a.w[1], 0)}&nbsp;°C</span></span>`;
}

function perbarui() {
  for (const g of ruang) {
    const el = document.querySelector(`.kartu[data-id="${g.id}"]`);
    const { s, teks } = status(g);
    if (!el) continue;
    el.dataset.status = s;
    el.dataset.pintu = g.pintu_status?.terbuka ? "buka" : "";
    el.setAttribute("aria-pressed", g.id === pilih);
    const m = Object.keys(g.metrik)[0], v = g.nilai[m];
    el.querySelector('[data-f="status"]').innerHTML = st(s, teks);
    el.querySelector('[data-f="nilai"]').innerHTML = s === "off" ? "Tidak ada data" : `${fmt(v, 1)}${satuan(g.metrik[m].satuan)}`;
    const termo = el.querySelector('[data-f="termo"]');
    if (termo) termo.innerHTML = termometer(g, s === "off" ? null : v);
    const bar = el.querySelector('[data-f="rhbar"]');
    if (bar) bar.innerHTML = `<span class="rh-isi" style="width:${s === "off" ? 0 : Math.min(100, (v / 10) * 100)}%"></span><span class="rh-batas" title="Batas 5 %RH"></span>`;
    el.querySelector('[data-f="pintu"]').innerHTML = pintuTeks(g);
  }
  const gd = ruang.find((g) => g.jenis === "gudang");
  if (gd) {
    const { s, teks } = status(gd);
    $("gudang").innerHTML = `<dl class="kv">${Object.entries(gd.metrik).map(([m, a]) => `<div><dt>${m === "suhu" ? "Suhu" : "Kelembapan"}</dt>
      <dd class="kv-nilai">${gd.nilai[m] != null ? fmt(gd.nilai[m], 1) : "-"}${satuan(a.satuan)}</dd><dd class="sub">Batas atas ${fmt(a.w[1], 0)}&nbsp;${a.satuan}</dd></div>`).join("")}</dl>${st(s, teks)}`;
  }
  temuan();
}

function temuan() {
  const masalah = ruang.map((g) => ({ g, ...status(g) })).filter((x) => x.s !== "ok").sort((a, b) => RANK[b.s] - RANK[a.s]);
  if (!masalah.length) { $("temuan").innerHTML = "<b>Semua ruang dalam batas dan semua pintu tertutup.</b>"; return; }
  const utama = masalah[0], g = utama.g, p = g.pintu_status;
  let kalimat;
  if (p?.terbuka && g.pintu) {
    const lama = Date.now() - p.sejak, sisa = g.pintu.batas_detik * 1000 - lama;
    kalimat = sisa > 0
      ? `<b>Pintu ${g.nama} terbuka ${durasi(lama)}; tutup dalam ${durasi(sisa)}.</b>`
      : `<b>Pintu ${g.nama} terbuka ${durasi(lama)}, lewat batas ${durasi(-sisa)}. Segera tutup.</b>`;
    const m = Object.keys(g.metrik)[0];
    if (g.nilai[m] != null) kalimat += ` Suhu sekarang ${fmt(g.nilai[m], 1)}&nbsp;°C, batas atas ${fmt(g.metrik[m].w[1], 0)}&nbsp;°C.`;
  } else kalimat = `<b>${g.nama}: ${utama.teks.toLowerCase()}.</b>`;
  const lain = masalah.slice(1).map((x) => `${x.g.nama} (${x.teks.toLowerCase()})`);
  $("temuan").innerHTML = kalimat + (lain.length ? ` Perlu dicek juga: ${lain.join(", ")}.` : "");
}

// ---------- grafik riwayat ruang terpilih
async function grafik() {
  const g = ruang.find((x) => x.id === pilih);
  const m = Object.keys(g.metrik)[0], a = g.metrik[m];
  $("grafik-sub").textContent = `${g.nama}, ${m === "suhu" ? "suhu" : "kelembapan"} rata-rata per 15 menit (${a.satuan})`;
  const box = $("grafik");
  box.innerHTML = `<p class="memuat">Memuat riwayat ${g.nama}…</p>`;
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
    box.innerHTML = `<p class="galat">Riwayat ${g.nama} tidak dapat dimuat. Pilih kartunya lagi dalam beberapa saat. <span class="sub">Detail: ${e.message}</span></p>`;
    return;
  }
  if (pilih !== g.id) return;
  if (!deret.length) { box.innerHTML = `<p class="kosong">Belum ada riwayat untuk ${g.nama}. Riwayat muncul setelah sensor mengirim data.</p>`; return; }
  box.innerHTML = `<div id="g-utama" data-label="Riwayat ${g.nama} 24 jam"></div>`;
  const bands = [];
  a.w.forEach((v, i) => v != null && bands.push({ y: v, label: `${i ? "Batas atas" : "Batas bawah"} ${fmt(v, 0)}`, color: "var(--warn)" }));
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
  if (typeof mqtt === "undefined") return pollingSaja("Pustaka MQTT tidak termuat karena CDN tidak terjangkau");
  const c = mqtt.connect(MQTT_URL, { reconnectPeriod: 3000, connectTimeout: 5000, clientId: `dasbor-${Math.random().toString(16).slice(2, 8)}` });
  c.on("connect", () => { pita(""); koneksi("Data langsung", "hidup"); c.subscribe("gudang/+/+"); });
  c.on("reconnect", () => koneksi("Menyambungkan ulang…", "putus"));
  c.on("error", (e) => pita(`Broker MQTT menolak sambungan (${e.message}). Angka di layar mungkin bukan yang terbaru.`));
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
  pita(`${sebab}. Data diambil dari API tiap 10 detik.`);
  koneksi("Diperbarui tiap 10 detik", "putus");
  setInterval(async () => { try { ruang = await ambilRuang(); jadwalkan(); } catch { koneksi("Server tidak menjawab", "putus"); } }, 10e3);
}

function modeContoh(pesan) {
  contohAktif = true;
  pita(pesan);
  // Penanda tunggal data contoh di bilah atas. Pratinjau: API memang tidak dijalankan, jadi status koneksi disembunyikan.
  const tanda = document.querySelector("[data-pratinjau]");
  tanda.hidden = false;
  if (PRATINJAU) { tanda.textContent = "Pratinjau, data contoh"; $("koneksi").hidden = true; }
  else koneksi("Tidak tersambung", "putus");
  const c = window.CONTOH_RUANG, geser = Date.now() - c.ts;
  ruang = c.ruang.map((g) => ({ ...g, ts: Object.fromEntries(Object.entries(g.ts).map(([k, v]) => [k, v + geser])),
    pintu_status: g.pintu_status && { ...g.pintu_status, sejak: g.pintu_status.sejak + geser } }));
}

async function mulai() {
  if (!LANGSUNG) modeContoh("Menampilkan data contoh karena dasbor dibuka langsung dari berkas. Untuk data langsung, jalankan docker compose lalu buka http://localhost:18060.");
  else {
    try { ruang = await ambilRuang(); sambungMqtt(); }
    catch (e) { modeContoh(`Menampilkan data contoh karena API tidak menjawab (${e.message}). Periksa layanan dengan docker compose -p konsep-06 ps.`); }
  }
  kerangka();
  perbarui();
  grafik();
  setInterval(perbarui, 1000); // hitung mundur pintu
  if (!contohAktif) setInterval(grafik, 60e3);
}

mulai();
