// Dasbor IPAL: menarik REST API (Slim) lewat /api/v1. Kunci API disisipkan proxy nginx, tidak ada di kode ini.
// Bila API tidak terjangkau, memakai data contoh bawaan dan menampilkan pita peringatan.

const API = "/api/v1";
const SEGAR_MS = 30000;
const $ = (id) => document.getElementById(id);
const jam = (s) => hhmm(new Date(s));
const durasi = (m) => (m >= 60 ? `${Math.floor(m / 60)} jam ${m % 60} menit` : `${m} menit`);
const URUT_P = ["ph", "cod", "tss", "nh3n", "debit", "suhu"];

let D = null, param = null, mode = "api";

async function ambil(path) {
  const r = await fetch(API + path, { signal: AbortSignal.timeout(5000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.pesan || `HTTP ${r.status}`);
  return j;
}

async function muat() {
  try {
    if (TANPA_API) throw new Error("dibuka sebagai file lokal");
    const [titik, par, kej, wh, lab] = await Promise.all([
      ambil("/titik"), ambil("/parameter"), ambil("/kejadian?limit=6"), ambil("/webhook?limit=6"), ambil("/lab?titik=S4"),
    ]);
    D = { titik: titik.data, par: par.data, kej: kej.data, wh, lab: lab.data };
    mode = "api";
    $("banner").hidden = true;
    $("sumber").className = "sumber live";
    $("sumber").textContent = `Terhubung ke API · pukul ${hhmm(new Date())}`;
  } catch (e) {
    D = contoh();
    mode = "contoh";
    $("banner").hidden = false;
    $("banner").textContent = `Mode data contoh: API tidak terhubung (${e.message}). Jalankan "docker compose up -d" di folder 10-ipal-lingkungan lalu buka http://localhost:18100.`;
    $("sumber").className = "sumber";
    $("sumber").textContent = "Data contoh bawaan";
  }
  const aktif = D.kej.find((k) => !k.selesai);
  if (!param) param = aktif ? aktif.parameter : "cod";
  gambar();
}

const P = (k) => D.par.find((p) => p.kode === k);
const angkaP = (k, v) => fmt(v, P(k).desimal);
const satuan = (k) => (P(k).satuan ? ` ${P(k).satuan}` : "");

function gambar() {
  const aktif = D.kej.filter((k) => !k.selesai);
  const s4 = D.titik.find((t) => t.kode === "S4");
  if (aktif.length) {
    const k = aktif[0];
    $("temuan").innerHTML = `<b>${k.nama_parameter} di outlet ${angkaP(k.parameter, s4.nilai[k.parameter].nilai)}${satuan(k.parameter)}, melewati baku mutu ${angkaP(k.parameter, k.batas)}${satuan(k.parameter)} sejak pukul ${jam(k.mulai)}.</b> Periksa aerasi dan waktu tinggal di bak biologis; catat tindakan untuk laporan.`;
  } else {
    const dekat = Object.entries(s4.nilai).filter(([, v]) => v.status === "mendekati").map(([k]) => P(k).nama);
    $("temuan").innerHTML = dekat.length
      ? `<b>Semua parameter outlet di bawah baku mutu, tetapi ${dekat.join(" dan ")} mendekati batas.</b>`
      : "<b>Semua parameter outlet di bawah baku mutu.</b> Tidak ada tindakan yang diperlukan sekarang.";
  }

  $("alur").innerHTML = D.titik.map((t) => {
    const v = (k) => t.nilai[k] ? `<span>${P(k).nama.replace(" (NH3-N)", "")} <b class="${t.nilai[k].status === "melewati" ? "lewat" : ""}">${angkaP(k, t.nilai[k].nilai)}</b></span>` : "";
    return `<div class="tahap ${t.wajib_baku_mutu ? "wajib" : ""}"><span class="penanda" aria-hidden="true">${t.kode}</span>
      <div class="nm">${t.kode} · ${t.nama}</div><div class="th">${t.tahap}</div>
      <div class="vals">${v("cod")}${v("tss")}${v("nh3n")}</div></div>`;
  }).join("");

  $("pilihParam").innerHTML = URUT_P.map((k) => `<button type="button" data-p="${k}" aria-pressed="${k === param}">${P(k).nama.replace(" (NH3-N)", "")}</button>`).join("");

  $("daftarKejadian").innerHTML = D.kej.length ? D.kej.map((k) => `<li>
      <div class="row">${k.selesai ? st("ok", "Selesai") : st("crit", "Berlangsung")}<span class="ttl">${k.nama_parameter} di ${k.titik}</span></div>
      <div class="det">Puncak <b>${angkaP(k.parameter, k.puncak)}</b>${satuan(k.parameter)}, batas ${angkaP(k.parameter, k.batas)}${satuan(k.parameter)} ·
        pukul ${jam(k.mulai)}${k.selesai ? ` sampai ${jam(k.selesai)}` : ""} (${durasi(k.durasi_menit)})</div></li>`).join("")
    : `<li class="kosong">Tidak ada kejadian melewati baku mutu.</li>`;

  const r = D.wh.ringkasan;
  $("kirim").innerHTML = `<div class="ring">
      <div><div class="l">Terakhir terkirim</div><div class="v">${r.terakhir_terkirim ? jam(r.terakhir_terkirim) : "belum ada"}</div></div>
      <div><div class="l">Gagal, 24 jam</div><div class="v">${r.gagal_24jam} <small class="l">dari ${r.total_24jam}</small></div></div></div>
    <ul class="log">${D.wh.data.map((x) => `<li><span class="w">${jam(x.waktu)}</span>${x.hasil === "terkirim" ? st("ok", "Terkirim") : st("crit", "Gagal")}
      <span class="muted">${x.jumlah_data} data</span>${x.galat ? `<span class="g">${x.galat}. Data ikut dikirim ulang pada percobaan berikutnya.</span>` : ""}</li>`).join("")}</ul>`;

  $("matriks").innerHTML = `<thead><tr><th>Titik</th>${URUT_P.map((k) => `<th class="n">${P(k).nama}${P(k).satuan ? ` (${P(k).satuan})` : ""}</th>`).join("")}<th>Status outlet</th></tr></thead>
    <tbody>${D.titik.map((t) => {
      const lewat = Object.entries(t.nilai).filter(([, v]) => v.status === "melewati").map(([k]) => P(k).nama);
      const dekat = Object.entries(t.nilai).filter(([, v]) => v.status === "mendekati").map(([k]) => P(k).nama);
      return `<tr class="${t.wajib_baku_mutu ? "wajib" : ""}"><td><span class="pk">${t.kode}</span>${t.nama}</td>${URUT_P.map((k) => {
        const v = t.nilai[k];
        return `<td class="n ${v?.status === "melewati" ? "lewat" : v?.status === "mendekati" ? "dekat" : ""}">${v ? angkaP(k, v.nilai) : "-"}</td>`;
      }).join("")}<td>${!t.wajib_baku_mutu ? '<span class="muted">dipantau</span>' : lewat.length ? st("crit", `Melewati: ${lewat.join(", ")}`) : dekat.length ? st("warn", `Mendekati: ${dekat.join(", ")}`) : st("ok", "Di bawah baku mutu")}</td></tr>`;
    }).join("")}</tbody>`;

  $("lab").innerHTML = D.lab.length ? `<thead><tr><th>Tanggal</th><th>Parameter</th><th class="n">Nilai</th><th>Laboratorium</th></tr></thead>
    <tbody>${D.lab.map((l) => `<tr><td>${new Date(l.tanggal_sampling).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td><td>${l.nama_parameter}</td>
      <td class="n">${angkaP(l.parameter, l.nilai)}${l.satuan ? " " + l.satuan : ""}</td><td>${l.lab}</td></tr>`).join("")}</tbody>`
    : `<tbody><tr><td class="kosong">Belum ada hasil laboratorium untuk outlet.</td></tr></tbody>`;

  grafik();
}

async function grafik() {
  const p = P(param);
  let d;
  try {
    if (mode !== "api") throw 0;
    d = (await ambil(`/pembacaan?titik=S4&parameter=${param}&jam=24&interval=10`)).data;
  } catch { d = contohDeret(param); }
  $("judulGrafik").textContent = `${p.nama} outlet S4 terhadap baku mutu, 24 jam`;
  $("subGrafik").textContent = `${p.satuan || "tanpa satuan"} · rata-rata 10 menit`;
  if (!d.length) { $("grafik").innerHTML = `<p class="kosong">Belum ada pembacaan 24 jam terakhir.</p>`; return; }
  const vals = d.map((x) => x.rata);
  const bands = [];
  if (p.bm_maks != null) bands.push({ y: p.bm_maks, label: `baku mutu ${angkaP(param, p.bm_maks)}`, color: "var(--crit)" });
  if (p.bm_min != null) bands.push({ y: p.bm_min, label: `batas bawah ${angkaP(param, p.bm_min)}`, color: "var(--crit)" });
  const atas = Math.max(...vals, p.bm_maks ?? 0) * 1.15;
  const marks = D.kej.filter((k) => k.parameter === param)
    .map((k) => ({ i: d.findIndex((x) => new Date(x.waktu) >= new Date(k.mulai)), label: `melewati ${jam(k.mulai)}` }))
    .filter((m) => m.i >= 0);
  lineChart($("grafik"), { x: d.map((x) => new Date(x.waktu)), h: 320, unit: p.satuan, dec: p.desimal,
    min: param === "ph" ? 5 : 0, max: param === "ph" ? 10 : Math.ceil(atas / 5) * 5,
    series: [{ name: p.nama, color: "var(--s1)", data: vals }], bands, marks });
}

$("pilihParam").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  param = b.dataset.p;
  document.querySelectorAll("#pilihParam button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  grafik();
});

// ---------- data contoh (API mati) ----------
function contoh() {
  const iso = (m) => new Date(NOW - m * 60000).toISOString();
  const nilai = (o, s) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { nilai: v, waktu: iso(0), status: s?.[k] || "dipantau" }]));
  return {
    par: [
      { kode: "ph", nama: "pH", satuan: "", bm_min: 6, bm_maks: 9, desimal: 1 },
      { kode: "cod", nama: "COD", satuan: "mg/L", bm_min: null, bm_maks: 100, desimal: 0 },
      { kode: "tss", nama: "TSS", satuan: "mg/L", bm_min: null, bm_maks: 100, desimal: 0 },
      { kode: "nh3n", nama: "Amonia (NH3-N)", satuan: "mg/L", bm_min: null, bm_maks: 5, desimal: 1 },
      { kode: "debit", nama: "Debit", satuan: "m³/jam", bm_min: null, bm_maks: null, desimal: 1 },
      { kode: "suhu", nama: "Suhu", satuan: "°C", bm_min: null, bm_maks: null, desimal: 1 },
    ],
    titik: [
      { kode: "S1", nama: "Inlet IPAL", tahap: "Air limbah masuk (influen)", wajib_baku_mutu: false, nilai: nilai({ ph: 7.7, cod: 1043, tss: 514, nh3n: 39.3, debit: 18.1, suhu: 32.7 }) },
      { kode: "S2", nama: "Setelah koagulasi", tahap: "Koagulasi dan flokulasi", wajib_baku_mutu: false, nilai: nilai({ ph: 7.1, cod: 470, tss: 98, nh3n: 33.1, debit: 18, suhu: 32.1 }) },
      { kode: "S3", nama: "Setelah aerasi", tahap: "Pengolahan biologis", wajib_baku_mutu: false, nilai: nilai({ ph: 7.3, cod: 131, tss: 66, nh3n: 8.9, debit: 17.6, suhu: 31 }) },
      { kode: "S4", nama: "Outlet IPAL", tahap: "Titik buang ke badan air (efluen)", wajib_baku_mutu: true,
        nilai: nilai({ ph: 7.2, cod: 61, tss: 33, nh3n: 6.3, debit: 17.2, suhu: 30.4 }, { ph: "normal", cod: "normal", tss: "normal", nh3n: "melewati", debit: "tanpa_baku_mutu", suhu: "tanpa_baku_mutu" }) },
    ],
    kej: [
      { titik: "S4", parameter: "nh3n", nama_parameter: "Amonia (NH3-N)", mulai: iso(31), selesai: null, puncak: 6.3, batas: 5, durasi_menit: 31 },
      { titik: "S4", parameter: "cod", nama_parameter: "COD", mulai: iso(192), selesai: iso(160), puncak: 135.6, batas: 100, durasi_menit: 32 },
    ],
    wh: { ringkasan: { terakhir_terkirim: iso(1), gagal_24jam: 1, total_24jam: 6 },
      data: [0, 1, 2, 3, 4].map((i) => ({ waktu: iso(1 + i), hasil: i === 2 ? "gagal" : "terkirim", jumlah_data: 12, galat: i === 2 ? "Penerima menjawab HTTP 503" : null })) },
    lab: [{ tanggal_sampling: iso(7 * 1440), parameter: "cod", nama_parameter: "COD", satuan: "mg/L", nilai: 58, lab: "Laboratorium internal" }],
  };
}
function contohDeret(k) {
  const dasar = { ph: 7.2, cod: 55, tss: 30, nh3n: 2.5, debit: 17, suhu: 29.5 }[k];
  const x = times(144, 10), v = gen(144, { base: dasar, amp: dasar * 0.08, noise: dasar * 0.05, seed: k.length * 7 });
  if (k === "cod") for (let i = 124; i < 129; i++) v[i - 100] += 70 * Math.sin(((i - 124) / 5) * Math.PI);
  if (k === "nh3n") for (let i = 139; i < 144; i++) v[i] += 3.6 * Math.min(1, (i - 138) / 3);
  return x.map((w, i) => ({ waktu: w.toISOString(), rata: v[i] }));
}

muat();
setInterval(() => mode === "api" && muat(), SEGAR_MS);
