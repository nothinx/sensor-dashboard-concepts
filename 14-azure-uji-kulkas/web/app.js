// Dasbor Uji Akhir Lini Kulkas. Data: REST /api/ringkasan + long polling /api/perubahan (Cosmos DB _ts).
// Dibuka sebagai file atau API mati → data contoh bawaan dengan bentuk yang sama persis dengan API.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NAMA = { L1: "Lini 1", L2: "Lini 2" };
const ALASAN = { vakum: "Vakum tidak tercapai", bocor: "Bocor melebihi batas", dingin: "Pendinginan kurang", arus: "Arus kompresor di luar batas" };
const pukul = (iso) => hhmm(new Date(iso));
const persen = (v) => (v == null ? "-" : `${fmt(v, 0)} %`);

let data = null, pilihan = null, modeContoh = false, ikuti = true; // ikuti = panel unit mengikuti unit terbaru
const cacheUnit = new Map(); // unit → daftar percobaan (dengan kurva)
if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";

// ---------- render ----------
function render(d) {
  data = d;
  const L = d.lini, terburuk = ["L1", "L2"].sort((a, b) => (L[a].fpy_20_terakhir ?? 100) - (L[b].fpy_20_terakhir ?? 100))[0];
  const f20 = L[terburuk].fpy_20_terakhir, utama = d.alasan_gagal[0];
  if (f20 != null && f20 < d.fpy_min) {
    $("judul").textContent = `${NAMA[terburuk]} di bawah target: FPY 20 unit terakhir ${persen(f20)}`;
    $("temuan").innerHTML = `<b>Penyebab gagal terbanyak 24 jam: ${esc(utama.label.toLowerCase())} (${utama.jumlah} unit).</b> Periksa stasiun uji ${NAMA[terburuk]} sebelum unit berikutnya masuk; target FPY ${fmt(d.fpy_min, 0)} %.`;
  } else {
    $("judul").textContent = `Kedua lini memenuhi target FPY ${fmt(d.fpy_min, 0)} %`;
    $("temuan").innerHTML = `<b>${d.jumlah_menunggu} unit menunggu uji ulang.</b> ${utama ? `Penyebab gagal terbanyak 24 jam: ${esc(utama.label.toLowerCase())}.` : ""}`;
  }
  const unit24 = L.L1.unit_24j + L.L2.unit_24j;
  // merah hanya untuk unit gagal; angka ringkasan tetap netral, FPY di bawah target diberi tanda peringatan
  const kpi = [
    ["FPY Lini 1, 24 jam", persen(L.L1.fpy_24j), L.L1.fpy_24j < d.fpy_min],
    ["FPY Lini 2, 24 jam", persen(L.L2.fpy_24j), L.L2.fpy_24j < d.fpy_min],
    ["Unit diuji, 24 jam", `${fmt(unit24, 0)}<small>unit</small>`],
    ["Menunggu uji ulang", `${d.jumlah_menunggu}<small>unit</small>`],
    ["Alarm, 24 jam", `${d.alarm.length}`],
  ];
  $("kpis").innerHTML = kpi.map(([l, v, bawah]) => `<div><dt>${l}</dt><dd>${v}${bawah ? `<small class="bawah">di bawah ${fmt(d.fpy_min, 0)} %</small>` : ""}</dd></div>`).join("");
  for (const l of ["L1", "L2"]) {
    $(`lini-${l}`).innerHTML = kartuLini(l, L[l], d.fpy_min);
    $(`lini-${l}`).classList.toggle("bawah", L[l].fpy_20_terakhir != null && L[l].fpy_20_terakhir < d.fpy_min);
  }
  if (ikuti || !cacheUnit.has(pilihan)) {
    const t = [L.L1.terakhir, L.L2.terakhir].filter(Boolean).sort((a, b) => b.waktu.localeCompare(a.waktu))[0];
    if (t) { if (!modeContoh) cacheUnit.set(t.unit, [t]); pilihan = t.unit; }
  }
  if (pilihan) tampilUnit(pilihan);
  grafikFpy(d);
  const maks = Math.max(1, ...d.alasan_gagal.map((a) => a.jumlah));
  $("alasan").innerHTML = d.alasan_gagal.length ? d.alasan_gagal.map((a) => `<div class="hbar"><span class="lbl">${esc(a.label)}</span>
    <div class="trk"><div class="fill" style="width:${(a.jumlah / maks) * 100}%"></div></div><span class="n">${a.jumlah}</span></div>`).join("")
    : `<p class="memuat">Tidak ada unit gagal dalam 24 jam.</p>`;
  $("menunggu-sub").textContent = `${d.jumlah_menunggu} unit, terbaru di atas`;
  $("l-menunggu").innerHTML = d.menunggu_ulang.length ? d.menunggu_ulang.slice(0, 5).map((u) => `<li><span class="id">${esc(u.unit)}</span>
    <span class="mono small">${pukul(u.waktu)}</span><span class="ket">${u.alasan.map((a) => ALASAN[a]).join(", ")}</span></li>`).join("")
    : `<li><span class="kosong">Tidak ada unit yang menunggu uji ulang.</span></li>`;
  $("l-alarm").innerHTML = d.alarm.length ? d.alarm.slice(0, 4).map((a) => `<li>${st(a.tingkat === "kritis" ? "crit" : "warn")}
    <span class="mono small">${pukul(a.waktu)}</span><span class="ket">${esc(a.pesan)}</span></li>`).join("")
    : `<li><span class="kosong">Tidak ada alarm dalam 24 jam.</span></li>`;
  $("main").setAttribute("aria-busy", "false");
}

// lajur lini: pelat nama di kiri, sabuk 10 percobaan terakhir (terbaru di kanan, dekat bilik uji), rincian di bawah sabuk
function kartuLini(l, x, fpyMin) {
  const t = x.terakhir, bawah = x.fpy_20_terakhir != null && x.fpy_20_terakhir < fpyMin;
  return `<div class="pelat">
      <div class="nama"><h2 id="h-${l}">${NAMA[l]}</h2><span class="model">${esc(t?.model ?? "")}</span></div>
      <div class="fpy"><span>FPY 20 unit terakhir</span><b>${persen(x.fpy_20_terakhir)}</b></div>
      ${bawah ? st("warn", `Di bawah target ${fmt(fpyMin, 0)} %`) : st("ok", `Memenuhi target ${fmt(fpyMin, 0)} %`)}
    </div>
    <div class="jalur">
      <h3>10 percobaan terakhir, terbaru di kanan</h3>
      <div class="sabuk">${[...x.riwayat].reverse().map((u) => stempel(u)).join("")}<span class="bilik">bilik uji</span></div>
      <dl class="rinci"><div><dt>Unit 24 jam</dt><dd>${fmt(x.unit_24j, 0)}</dd></div><div><dt>Unit jam berjalan</dt><dd>${x.fpy_per_jam[23].unit}</dd></div>
        <div><dt>Gagal percobaan pertama</dt><dd>${x.gagal_24j}</dd></div><div><dt>Menunggu uji ulang</dt><dd>${x.menunggu}</dd></div><div><dt>FPY 24 jam</dt><dd>${persen(x.fpy_24j)}</dd></div></dl>
    </div>`;
}

function stempel(u, besar = false) {
  const t = u.hasil === "lulus" ? "LULUS" : "GAGAL", seq = u.unit.slice(-4);
  const label = `${u.unit}, percobaan ${u.percobaan}, ${u.hasil}, pukul ${pukul(u.waktu)}`;
  if (besar) return `<div class="stempel besar ${u.hasil}" role="img" aria-label="Hasil: ${t}"><span class="t">${t}</span><span class="s">P${u.percobaan}</span></div>`;
  const miring = ((parseInt(seq, 10) || 0) % 5) * 2 - 4; // cap tangan tidak pernah lurus sempurna
  return `<button type="button" class="stempel ${u.hasil}" style="--r:${miring}deg" data-unit="${esc(u.unit)}" aria-pressed="${u.unit === pilihan}" aria-label="${esc(label)}" title="${esc(label)}">
    <span><span class="t">${t}</span><br><span class="s">${seq}${u.percobaan > 1 ? "·2" : ""}</span></span></button>`;
}

async function pilihUnit(unit) {
  pilihan = unit;
  ikuti = unit === terbaruUnit();
  document.querySelectorAll(".stempel[data-unit]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.unit === unit));
  if (!cacheUnit.has(unit) || !cacheUnit.get(unit).some((p) => p.vakum_kurva)) {
    $("unit").innerHTML = `<p class="memuat">Memuat ${esc(unit)}</p>`;
    try { cacheUnit.set(unit, await ambil(`/api/unit/${encodeURIComponent(unit)}`)); }
    catch (e) { $("unit").innerHTML = `<p class="memuat">Detail ${esc(unit)} tidak bisa dimuat: ${esc(e.message)}. Pilih unit lain atau muat ulang halaman.</p>`; return; }
  }
  tampilUnit(unit);
}

function tampilUnit(unit) {
  const daftar = cacheUnit.get(unit);
  const u = daftar[daftar.length - 1], b = data.batas;
  $("h-unit").textContent = unit === terbaruUnit() ? "Unit terakhir diuji" : "Unit terpilih";
  const ukur = [
    ["Vakum ke 100 Pa", u.vakum_capai_s == null ? "tidak tercapai" : `${u.vakum_capai_s} dtk`, `batas ${b.vakum_waktu_maks_s} dtk`, u.alasan.includes("vakum")],
    ["Laju bocor", `${fmt(u.bocor_g_tahun, 2)} g/thn`, `batas ${fmt(b.bocor_maks_g_tahun)} g/thn`, u.alasan.includes("bocor")],
    [`Evaporator, ${b.dingin_menit} menit`, `${fmt(u.evap_c)} °C`, `batas ${fmt(b.dingin_evap_maks_c)} °C`, u.alasan.includes("dingin")],
    ["Arus kompresor", `${fmt(u.arus_a, 2)} A`, `${fmt(b.arus_min_a)} sampai ${fmt(b.arus_maks_a)} A`, u.alasan.includes("arus")],
  ];
  $("unit").innerHTML = `<div class="unit-kepala">${stempel(u, true)}
      <div><div class="id">${esc(u.unit)}</div>
      <p>${NAMA[u.lini]} · model ${esc(u.model)} · percobaan ke-${u.percobaan} · pukul ${pukul(u.waktu)}</p>
      <p>${u.hasil === "lulus" ? "Lulus semua uji; boleh lanjut ke pengemasan." : `Gagal: ${u.alasan.map((a) => ALASAN[a].toLowerCase()).join(", ")}. Kirim ke perbaikan lalu uji ulang.`}</p></div></div>
    <div class="vakum chart" id="vakum"></div>
    <div class="ukur">${ukur.map(([l, v, k, g]) => `<div><span>${l}</span><b class="${g ? "gagal" : ""}">${v}</b><small>${k}</small></div>`).join("")}</div>`;
  grafikVakum($("vakum"), u, b);
}

const terbaruUnit = () => [data.lini.L1.terakhir, data.lini.L2.terakhir].filter(Boolean).sort((a, b) => b.waktu.localeCompare(a.waktu))[0]?.unit;

// Momen: kurva penurunan tekanan (skala log) dengan jendela target
function grafikVakum(el, u, b) {
  const W = el.clientWidth || 700, H = 220, L = 64, R = 16, T = 12, B = 28;
  const lo = 1, hi = Math.log10(200000);
  const sx = (t) => L + (t / 300) * (W - L - R);
  const sy = (p) => T + (1 - (Math.log10(Math.max(p, 10)) - lo) / (hi - lo)) * (H - T - B);
  let g = `<rect x="${sx(0)}" y="${sy(b.vakum_target_pa)}" width="${sx(b.vakum_waktu_maks_s) - sx(0)}" height="${sy(10) - sy(b.vakum_target_pa)}"
      fill="var(--target)" stroke="var(--lulus)" stroke-dasharray="4 3"/>
    <text x="${sx(4)}" y="${sy(b.vakum_target_pa) + 18}" style="fill:var(--lulus)">jendela target: ≤ ${b.vakum_target_pa} Pa dalam ${b.vakum_waktu_maks_s} dtk</text>`;
  for (const [p, lbl] of [[100, "100 Pa"], [1000, "1 kPa"], [10000, "10 kPa"], [100000, "100 kPa"]])
    g += `<line x1="${L}" x2="${W - R}" y1="${sy(p)}" y2="${sy(p)}" stroke="var(--grid)"/><text x="${L - 6}" y="${sy(p) + 4}" text-anchor="end">${lbl}</text>`;
  for (let t = 0; t <= 300; t += W < 500 ? 100 : 60) g += `<text x="${sx(t)}" y="${H - 8}" text-anchor="${t === 0 ? "start" : t === 300 ? "end" : "middle"}">${t} dtk</text>`;
  const k = u.vakum_kurva;
  g += `<path d="${k.map(([t, p], i) => `${i ? "L" : "M"}${sx(t).toFixed(1)},${sy(p).toFixed(1)}`).join("")}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>`;
  if (u.vakum_capai_s != null) {
    const x = sx(u.vakum_capai_s), y = sy(b.vakum_target_pa);
    g += `<circle cx="${x}" cy="${y}" r="5" fill="var(--lulus)" stroke="var(--surface)" stroke-width="2"/>
      <text x="${x > W * 0.7 ? x - 8 : x + 8}" y="${y - 8}" text-anchor="${x > W * 0.7 ? "end" : "start"}" style="fill:${u.alasan.includes("vakum") ? "var(--gagal)" : "var(--ink)"};font-weight:500">tercapai ${u.vakum_capai_s} dtk${u.alasan.includes("vakum") ? ", terlambat" : ""}</text>`;
  } else {
    const [t, p] = k[k.length - 1];
    g += `<text x="${sx(t)}" y="${sy(p) - 10}" text-anchor="end" style="fill:var(--gagal);font-weight:500">tertahan di ${fmt(p, 0)} Pa</text>`;
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Kurva vakum ${esc(u.unit)}">${g}
    <line class="xh" y1="${T}" y2="${H - B}" stroke="var(--ink-2)" opacity="0"/></svg><div class="tip"></div>`;
  const svg = el.querySelector("svg"), tip = el.querySelector(".tip"), xh = el.querySelector(".xh");
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect(), t = (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * 300;
    const i = Math.max(0, Math.min(k.length - 1, Math.round(t / 12)));
    xh.setAttribute("x1", sx(k[i][0])); xh.setAttribute("x2", sx(k[i][0])); xh.setAttribute("opacity", 1);
    tip.innerHTML = `${k[i][0]} dtk<br>${fmt(k[i][1], 0)} Pa`;
    tip.style.left = (sx(k[i][0]) / W) * r.width + "px"; tip.style.top = (sy(k[i][1]) / H) * r.height + "px"; tip.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; xh.setAttribute("opacity", 0); });
}

function grafikFpy(d) {
  const x = d.lini.L1.fpy_per_jam.map((h) => new Date(h.jam));
  lineChart($("fpy"), {
    x, h: 230, unit: "%", min: 50, max: 100, dec: 0, ticks: 5,
    series: [{ name: "Lini 1", color: "var(--s1)", data: d.lini.L1.fpy_per_jam.map((h) => h.fpy) },
             { name: "Lini 2", color: "var(--s2)", data: d.lini.L2.fpy_per_jam.map((h) => h.fpy) }],
    bands: [{ y: d.fpy_min, label: `target ${fmt(d.fpy_min, 0)} %`, color: "var(--ink-2)" }],
  });
}

// ---------- data API ----------
async function ambil(path, opt = {}) {
  const r = await fetch(path, { headers: { Accept: "application/json" }, ...opt });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `HTTP ${r.status}`);
  return r.json();
}
function sambung(teks) { $("conn").textContent = teks; }
function banner(html) { const b = $("banner"); b.innerHTML = html; b.hidden = !html; }

async function dengar() {
  // long polling: server menahan permintaan sampai ada dokumen baru (maks 25 detik)
  for (;;) {
    try {
      const r = await ambil(`/api/perubahan?sejak=${data.ts}`);
      if (r.ada_baru) render(await ambil("/api/ringkasan"));
      banner("");
      sambung(`Tersambung · diperbarui pukul ${hhmm(new Date())}`);
    } catch (e) {
      sambung("Koneksi terputus");
      banner(`Koneksi ke API terputus (${esc(e.message)}). Data di layar dari pukul ${pukul(data.sekarang)}; mencoba lagi tiap 5 detik. Periksa <code>docker compose -p konsep-14 ps</code>.`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

document.addEventListener("click", (e) => {
  const b = e.target.closest(".stempel[data-unit]");
  if (b) pilihUnit(b.dataset.unit);
});

// ---------- data contoh (bentuk sama dengan /api/ringkasan) ----------
function contoh() {
  const r = rng(14), sekarang = new Date(), batas = { vakum_target_pa: 100, vakum_waktu_maks_s: 240, bocor_maks_g_tahun: 3, dingin_menit: 10, dingin_evap_maks_c: -12, arus_min_a: 0.6, arus_maks_a: 1.4 };
  const model = { L1: "KLK-2P-260", L2: "KLK-1P-180" }, pGagal = { L1: 0.05, L2: 0.08 };
  const dok = [];
  const ymd = `${String(sekarang.getFullYear()).slice(2)}${pad(sekarang.getMonth() + 1)}${pad(sekarang.getDate())}`;
  const buat = (l, seq, t, percobaan) => {
    const ganggu = l === "L2" && percobaan === 1 && sekarang - t < 90 * 60000 ? 0.18 : 0;
    const gagal = r() < pGagal[l] * (percobaan > 1 ? 0.35 : 1) + ganggu ? (r() < 0.5 + ganggu * 2 ? "vakum" : ["bocor", "dingin", "arus"][Math.floor(r() * 3)]) : null;
    const tau = 25 + r() * 6 * (gagal === "vakum" && r() < 0.5 ? 1.45 : 1);
    const dasar = gagal === "vakum" ? 180 + r() * 140 : 25 + r() * 35;
    const kurva = [], f = (s) => 101325 * Math.exp(-s / tau) + dasar;
    for (let s = 0; s <= 300; s += 12) kurva.push([s, Math.round(f(s) * 10) / 10]);
    let capai = null;
    for (let s = 0; s <= 300; s++) if (f(s) <= 100) { capai = s; break; }
    const u = {
      unit: `${model[l]}-${l}-${ymd}-${String(seq).padStart(4, "0")}`, lini: l, model: model[l], percobaan, waktu: t.toISOString(),
      bocor_g_tahun: +(gagal === "bocor" ? 3.4 + r() * 3 : 0.2 + r() * 1.4).toFixed(2),
      evap_c: +(gagal === "dingin" ? -10.5 + r() * 3.5 : -17.5 + r() * 4.3).toFixed(1),
      arus_a: +(gagal === "arus" ? 1.45 + r() * 0.25 : 0.82 + r() * 0.33).toFixed(2),
      vakum_capai_s: capai, vakum_akhir_pa: kurva[kurva.length - 1][1], vakum_kurva: kurva,
    };
    u.alasan = [capai == null || capai > 240 ? "vakum" : null, u.bocor_g_tahun > 3 ? "bocor" : null, u.evap_c > -12 ? "dingin" : null,
      u.arus_a < 0.6 || u.arus_a > 1.4 ? "arus" : null].filter(Boolean);
    u.hasil = u.alasan.length ? "gagal" : "lulus";
    return u;
  };
  const seq = { L1: 0, L2: 0 }, ulang = [];
  for (let t = new Date(sekarang - 864e5); t < sekarang; t = new Date(+t + 120000)) {
    for (const l of ["L1", "L2"]) {
      const u = buat(l, ++seq[l], new Date(+t + (l === "L2" ? 40000 : 0)), 1);
      dok.push(u);
      if (u.hasil === "gagal") ulang.push([+t + (25 + r() * 45) * 60000, l, seq[l]]);
    }
    for (const x of ulang.filter((x) => x[0] <= +t && x[0] < +sekarang)) { ulang.splice(ulang.indexOf(x), 1); dok.push(buat(x[1], x[2], new Date(x[0]), 2)); }
  }
  dok.sort((a, b) => a.waktu.localeCompare(b.waktu));
  const fpyOf = (ds) => { const p = ds.filter((d) => d.percobaan === 1); return p.length ? (100 * p.filter((d) => d.hasil === "lulus").length) / p.length : null; };
  const jam0 = new Date(sekarang); jam0.setMinutes(0, 0, 0);
  const lini = {};
  for (const l of ["L1", "L2"]) {
    const dl = dok.filter((d) => d.lini === l), pertama = dl.filter((d) => d.percobaan === 1);
    lini[l] = {
      unit_24j: pertama.length, fpy_24j: fpyOf(pertama), fpy_20_terakhir: fpyOf(pertama.slice(-20)),
      fpy_per_jam: Array.from({ length: 24 }, (_, i) => {
        const a = new Date(+jam0 - (23 - i) * 36e5), b = new Date(+a + 36e5), di = pertama.filter((d) => new Date(d.waktu) >= a && new Date(d.waktu) < b);
        return { jam: a.toISOString(), fpy: fpyOf(di), unit: di.length };
      }),
      terakhir: dl[dl.length - 1], riwayat: dl.slice(-10).reverse(),
      gagal_24j: pertama.filter((d) => d.hasil === "gagal").length,
    };
  }
  dok.forEach((u) => cacheUnit.set(u.unit, [...(cacheUnit.get(u.unit) || []), u].sort((a, b) => a.percobaan - b.percobaan)));
  const diulang = new Set(dok.filter((d) => d.percobaan > 1).map((d) => d.unit));
  const menunggu = dok.filter((d) => d.percobaan === 1 && d.hasil === "gagal" && !diulang.has(d.unit)).reverse();
  for (const l of ["L1", "L2"]) lini[l].menunggu = menunggu.filter((u) => u.lini === l).length;
  const hit = {};
  dok.filter((d) => d.percobaan === 1).forEach((d) => d.alasan.forEach((a) => { hit[a] = (hit[a] || 0) + 1; }));
  const alarm = dok.filter((d) => d.percobaan > 1 && d.hasil === "gagal").map((d) => ({ tingkat: "kritis", waktu: d.waktu,
    pesan: `${d.unit} gagal lagi pada percobaan ke-2. Tarik dari lini untuk analisis.` }));
  if (lini.L2.fpy_20_terakhir < 90) alarm.push({ tingkat: "peringatan", waktu: lini.L2.terakhir.waktu,
    pesan: `FPY ${fmt(lini.L2.fpy_20_terakhir, 0)} % pada 20 unit terakhir, di bawah 90 %. Penyebab terbanyak: vakum tidak tercapai.` });
  alarm.sort((a, b) => b.waktu.localeCompare(a.waktu));
  return { sekarang: sekarang.toISOString(), batas, fpy_min: 90, lini, menunggu_ulang: menunggu.slice(0, 12), jumlah_menunggu: menunggu.length,
    alasan_gagal: Object.entries(hit).sort((a, b) => b[1] - a[1]).map(([kode, jumlah]) => ({ kode, label: ALASAN[kode], jumlah })), alarm: alarm.slice(0, 8), ts: 0 };
}

function pakaiContoh(sebab) {
  modeContoh = true;
  render(contoh());
  sambung("API tidak terhubung, memakai data contoh bawaan");
  $("conn").hidden = PRATINJAU; // pratinjau: cukup penanda di header
  banner(`Mode data contoh: ${esc(sebab)}. Jalankan <code>docker compose -p konsep-14 up -d</code> di folder proyek 14 lalu buka <code>http://localhost:18140</code>.`);
}

(async function mulai() {
  if (TANPA_API) return pakaiContoh("API tidak terhubung karena dasbor dibuka langsung dari berkas");
  try {
    render(await ambil("/api/ringkasan"));
    sambung(`Tersambung · diperbarui pukul ${hhmm(new Date())}`);
    dengar();
  } catch (e) {
    pakaiContoh(`API tidak menjawab (${e.message})`);
  }
})();
