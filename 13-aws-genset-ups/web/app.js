// Dasbor Genset & UPS Cabang: menarik data dari Lambda API (lewat /api, satu origin) tiap 10 detik.
// Daftar cabang dibaca per halaman memakai token `next` (LastEvaluatedKey DynamoDB).
// Tanpa API (file:// atau stack mati) dasbor memakai data contoh bawaan.

const API = "/api";
const SEGAR_MS = 10000;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ST = { kritis: "crit", waspada: "warn", normal: "ok" };
const ST_TEKS = { kritis: "Kritis", waspada: "Waspada", normal: "Normal" };
// bujur kota (derajat BT, dibulatkan 0,1°): ubin diletakkan pada sumbu barat-timur, bukan peta garis pantai
const LON = { MDN: 98.7, PLM: 104.8, JKT: 106.8, BKS: 107.0, BDG: 107.6, YOG: 110.4, SMG: 110.4, MLG: 112.6, SBY: 112.8, DPS: 115.2, BPN: 116.8, MKS: 119.4 };
const SUMBU = [97.4, 120.6], UBIN_DERAJAT = 2.2; // rentang sumbu dan lebar satu ubin dalam derajat
const posX = (lon) => ((lon - SUMBU[0]) / (SUMBU[1] - SUMBU[0])) * 100;
const fmtBujur = (lon) => `${fmt(lon, 1)}°`;
// angka + satuan: satuan lebih kecil dan redup, dipisah spasi tipis
const nu = (v, u) => `${v}<small class="u">&thinsp;${u}</small>`;
if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";

let mode = "api", cabang = [], pilih = null, padam = [], nextPadam = null;

const pukul = (iso) => hhmm(new Date(iso));
function durasi(dari, sampai) {
  const m = Math.max(0, Math.round(((sampai ? Date.parse(sampai) : Date.now()) - Date.parse(dari)) / 60000));
  return m < 60 ? `${m} menit` : `${Math.floor(m / 60)} jam ${m % 60} menit`;
}

async function ambil(path) {
  const r = await fetch(API + path, { signal: AbortSignal.timeout(5000) });
  const isi = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(isi.galat || `HTTP ${r.status}`);
  return isi;
}

async function semuaCabang() {
  const hasil = [];
  let next = null;
  do { // halaman 6 cabang, mengikuti LastEvaluatedKey sampai habis
    const h = await ambil(`/cabang?limit=6${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    hasil.push(...h.data);
    next = h.next;
  } while (next);
  return hasil;
}

// ---------- render ----------
function renderRingkasan(r) {
  $("kpis").innerHTML = [
    ["Cabang kritis", r.kritis, "crit", `dari ${r.total} cabang`],
    ["Cabang waspada", r.waspada, "", "mendekati batas aman"],
    ["PLN sedang padam", r.plnPadam, "", "cabang saat ini"],
    ["Genset menyala", r.gensetJalan, "", "menanggung beban cabang"],
  ].map(([l, v, k, d]) => `<div class="kpi"><div class="l">${l}</div><div class="v ${r.kritis && k ? k : ""}">${v}</div><div class="d">${d}</div></div>`).join("");
}

// paling gawat: tanpa listrik cadangan dulu (PLN padam, genset mati), lalu kritis lain, lalu waspada
const bobot = (c) => (!c.pln.ada && !c.genset.jalan ? 0 : c.status === "kritis" ? 1 : c.status === "waspada" ? 2 : 3);
const palingGawat = () => [...cabang].sort((a, b) => bobot(a) - bobot(b))[0];

function renderTemuan() {
  const g = [palingGawat()].find((c) => c && c.status !== "normal");
  const btn = $("btnGawat");
  if (!g) {
    $("temuan").innerHTML = `<b>Semua cabang normal.</b> PLN menyala dan cadangan siap di ${cabang.length} cabang.`;
    btn.hidden = true;
    return;
  }
  const tanpaCadangan = !g.pln.ada && !g.genset.jalan;
  const keadaan = tanpaCadangan ? `PLN padam sejak pukul ${pukul(g.pln.padamSejak)} dan genset tidak menyala.`
    : `${g.alasan.join(", ")}.`;
  const lanjut = tanpaCadangan ? ` UPS hanya bertahan sekitar ${fmt(g.ups.runtime, 0)} menit lagi.` : "";
  const lain = cabang.filter((c) => c.status !== "normal").length - 1;
  $("temuan").innerHTML = `<b>${esc(g.kota)}: ${esc(keadaan)}${esc(lanjut)}</b>${lain > 0 ? ` ${lain} cabang lain perlu dipantau.` : ""}`;
  btn.hidden = false;
  btn.textContent = `Lihat Cabang ${g.kota}`;
  btn.onclick = () => pilihCabang(g.kode);
}

function ubin(c, lajur) {
  const lon = LON[c.kode] ?? 110;
  const bbmK = c.genset.bbm < 20 ? "crit" : c.genset.bbm < 40 ? "warn" : "";
  return `<button class="ubin ${c.pln.ada ? "" : "padam"}" type="button" aria-pressed="${c.kode === pilih}" data-kode="${c.kode}"
      style="--x:${posX(lon).toFixed(2)};--lajur:${lajur}" aria-label="${esc(c.nama)}, status ${ST_TEKS[c.status].toLowerCase()}${c.pln.ada ? "" : `, PLN padam sejak pukul ${pukul(c.pln.padamSejak)}`}">
    ${c.pln.ada ? "" : `<span class="padam-sejak"><span class="panjang">PLN padam sejak</span><span class="pendek">Padam</span> ${pukul(c.pln.padamSejak)}</span>`}
    <span class="kota">${esc(c.kota)}<span class="kode">${c.kode}</span></span>
    <span class="tangki ${bbmK}" style="--isi:${c.genset.bbm}" title="Sisa solar ${fmt(c.genset.bbm, 0)}%"><i></i><span>${fmt(c.genset.bbm, 0)}</span></span>
    <span class="info">
      <span class="r"><span>Genset</span><b>${c.genset.jalan ? "Menyala" : "Siaga"}</b></span>
      <span class="r"><span>UPS</span><b>${nu(fmt(c.ups.baterai, 0), "%")}</b></span>
      <span class="baterai ${c.ups.baterai < 30 ? "crit" : ""}" style="--isi:${c.ups.baterai}"><i></i></span>
    </span>
    <span class="kaki">${st(ST[c.status], ST_TEKS[c.status])}<span class="bujur">${fmtBujur(lon)}</span></span>
  </button>`;
}

// ubin diurutkan barat ke timur; yang bertumpuk bujurnya naik ke lajur di atasnya (lajur 0 = dekat sumbu)
function renderPeta() {
  const urut = [...cabang].sort((a, b) => (LON[a.kode] ?? 110) - (LON[b.kode] ?? 110));
  const ujung = [];
  const html = urut.map((c) => {
    const lon = LON[c.kode] ?? 110, kiri = lon - UBIN_DERAJAT / 2;
    let l = ujung.findIndex((u) => u + 0.1 <= kiri);
    if (l < 0) l = ujung.length;
    ujung[l] = lon + UBIN_DERAJAT / 2;
    return ubin(c, l);
  });
  let garis = "";
  for (let d = 98; d <= 120; d += 2) garis += `<span class="meridian" style="--x:${posX(d).toFixed(2)}"><b>${d}°</b></span>`;
  const pin = urut.map((c) => `<i class="pin" style="--x:${posX(LON[c.kode] ?? 110).toFixed(2)}"></i>`).join("");
  $("peta").style.setProperty("--lajur-n", Math.max(1, ujung.length));
  $("peta").innerHTML = `<div class="garis" aria-hidden="true">${garis}${pin}<span class="arah">Barat</span><span class="arah timur">Timur</span></div>${html.join("")}`;
  $("peta").removeAttribute("aria-busy");
}

// diagram satu garis papan ATS: sumber mana yang sedang menanggung beban cabang
function diagramAts(c) {
  const sumber = c.pln.ada ? "pln" : c.genset.jalan ? "genset" : "ups";
  const on = (k) => (sumber === k ? "on" : "");
  const ujung = sumber === "pln" ? [150, 40] : sumber === "genset" ? [150, 110] : [160, 60];
  const teks = { pln: "PLN", genset: "genset", ups: "baterai UPS saja" }[sumber];
  return `<svg class="ats" viewBox="0 0 420 156" role="img" aria-label="Papan ATS: beban cabang ditanggung ${teks}">
    <g class="${on("pln")} ${c.pln.ada ? "" : "mati"}"><rect x="1" y="20" width="96" height="40"/><text x="49" y="45">PLN</text><path d="M97 40H146"/></g>
    <g class="${on("genset")}"><rect x="1" y="90" width="96" height="40"/><text x="49" y="115">Genset</text><path d="M97 110H146"/></g>
    <text class="kecil" x="49" y="78">${c.pln.ada ? "Menyala" : `Padam ${pukul(c.pln.padamSejak)}`}</text>
    <text class="kecil" x="49" y="148">${c.genset.jalan ? "Menyala" : "Siaga"}</text>
    <g class="kontak"><circle cx="150" cy="40" r="3.5"/><circle cx="150" cy="110" r="3.5"/></g>
    <g class="on"><line class="pisau" x1="196" y1="75" x2="${ujung[0]}" y2="${ujung[1]}"/><circle class="poros" cx="196" cy="75" r="4.5"/></g>
    <text class="kecil" x="196" y="100">ATS</text>
    <g class="${sumber === "ups" ? "" : "on"}"><path d="M200 75H236"/></g>
    <g class="on"><rect x="236" y="55" width="76" height="40"/><text x="274" y="80">UPS</text><path d="M312 75H332"/>
      <rect x="332" y="55" width="86" height="40"/><text x="375" y="80">Beban</text></g>
    <text class="kecil" x="274" y="116">${fmt(c.ups.baterai, 0)}&#8201;%</text><text class="kecil" x="375" y="116">${fmt(c.ups.beban, 0)}&#8201;%</text>
  </svg>`;
}

async function renderDetail() {
  const c = cabang.find((x) => x.kode === pilih);
  if (!c) return;
  const d = $("detail");
  d.innerHTML = `
    <div class="d-papan">
      <div class="d-judul"><h2>${esc(c.nama)}</h2>${st(ST[c.status], ST_TEKS[c.status])}</div>
      ${c.alasan.length ? `<ul class="alasan">${c.alasan.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : `<p class="sub">Semua nilai dalam batas aman.</p>`}
      ${diagramAts(c)}
    </div>
    <dl class="dk">
      <div><dt>Sisa solar genset</dt><dd>${nu(fmt(c.genset.bbm, 0), "%")}</dd></div>
      <div><dt>Keluaran genset</dt><dd>${c.genset.jalan ? `${nu(fmt(c.genset.tegangan, 0), "V")}&ensp;${nu(fmt(c.genset.frekuensi, 0), "Hz")}` : `<span class="redup">Tidak menyala</span>`}</dd></div>
      <div><dt>Baterai UPS</dt><dd>${nu(fmt(c.ups.baterai, 0), "%")}</dd></div>
      <div><dt>Sisa waktu UPS</dt><dd>${nu(fmt(c.ups.runtime, 0), "menit")}</dd></div>
      <div><dt>Beban UPS</dt><dd>${nu(fmt(c.ups.beban, 0), "%")}</dd></div>
      <div><dt>Jam operasi genset</dt><dd>${nu(fmt(c.genset.jamJalan, 0), "jam")}</dd></div>
    </dl>
    <div class="d-tren">
      <div class="d-judul"><h3>Solar dan baterai UPS, 24 jam terakhir</h3>
        <span class="legend"><span><i style="background:var(--s1)"></i>Sisa solar</span><span><i style="background:var(--s2)"></i>Baterai UPS</span></span></div>
      <div id="tren" data-label="Solar dan baterai UPS ${esc(c.kota)}, 24 jam"><p class="memuat">Memuat riwayat…</p></div>
      <p class="sub">Diperbarui pukul ${pukul(c.diperbarui)}. Kapasitas genset ${c.gensetKva}&nbsp;kVA, UPS ${c.upsKva}&nbsp;kVA.</p>
    </div>`;
  try {
    const rw = mode === "api" ? (await ambil(`/cabang/${c.kode}/riwayat?jam=24`)).data : riwayatContoh(c);
    if (!rw.length) { $("tren").innerHTML = `<p class="kosong">Belum ada riwayat untuk cabang ini.</p>`; return; }
    lineChart($("tren"), {
      x: rw.map((p) => new Date(p.ts)), unit: "%", min: 0, max: 100, dec: 0, h: 170,
      series: [{ name: "Sisa solar", color: "var(--s1)", data: rw.map((p) => p.bbm) }, { name: "Baterai", color: "var(--s2)", data: rw.map((p) => p.baterai) }],
      bands: [{ y: 20, label: "batas kritis 20%", color: "var(--crit)" }],
    });
  } catch (e) {
    $("tren").innerHTML = `<p class="kosong" title="${esc(e.message)}">Riwayat tidak bisa dimuat. Pilih cabang ini lagi untuk mencoba ulang.</p>`;
  }
}

function renderPadam() {
  $("padam").innerHTML = padam.length ? padam.map((p) => `<tr>
      <td>${esc(p.nama)}</td><td>${new Date(p.mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, pukul ${pukul(p.mulai)}</td>
      <td>${p.selesai ? `pukul ${pukul(p.selesai)}` : st("warn", "Masih padam")}</td>
      <td class="n">${durasi(p.mulai, p.selesai)}</td>
      <td>${p.gensetMenyala ? st("ok", "Menyala") : st("crit", "Tidak menyala")}</td></tr>`).join("")
    : `<tr><td colspan="5" class="kosong">Belum ada catatan PLN padam.</td></tr>`;
  $("btnLagi").hidden = !nextPadam;
}

function pilihCabang(kode) {
  pilih = kode;
  renderPeta();
  renderDetail();
}

// ---------- alur data ----------
async function segarkan(awal) {
  try {
    if (TANPA_API) throw new Error("halaman dibuka langsung dari berkas");
    const [r, c] = await Promise.all([ambil("/ringkasan"), semuaCabang()]);
    cabang = c;
    if (awal) { const h = await ambil("/padam?limit=6"); padam = h.data; nextPadam = h.next; }
    renderRingkasan(r);
    $("sumber").textContent = `Terhubung ke API, diperbarui pukul ${hhmm(new Date())}`;
    $("sumber").classList.remove("putus");
    $("banner").hidden = true;
  } catch (e) {
    if (mode === "api" && !awal) { // sempat tersambung: pertahankan data terakhir
      $("sumber").textContent = "Koneksi ke API terputus. Mencoba lagi tiap 10 detik.";
      $("sumber").title = e.message;
      $("sumber").classList.add("putus");
      return;
    }
    modeContoh(e.message);
  }
  if (!pilih || !cabang.some((x) => x.kode === pilih)) pilih = palingGawat()?.kode;
  renderTemuan();
  renderPeta();
  renderPadam();
  if (awal || mode === "api") renderDetail();
}

$("btnLagi").addEventListener("click", async () => {
  try {
    const h = await ambil(`/padam?limit=6&next=${encodeURIComponent(nextPadam)}`);
    padam.push(...h.data);
    nextPadam = h.next;
    renderPadam();
  } catch (e) { $("btnLagi").textContent = "Gagal memuat. Coba lagi"; $("btnLagi").title = e.message; }
});
$("peta").addEventListener("click", (e) => { const b = e.target.closest(".ubin"); if (b) pilihCabang(b.dataset.kode); });

// ---------- data contoh ----------
function modeContoh(sebab) {
  mode = "contoh";
  const now = Date.now(), iso = (m) => new Date(now + m * 60000).toISOString();
  const dasar = (kode, kota, i, ubah = {}) => {
    const c = { kode, kota, nama: `Cabang ${kota}`, gensetKva: [100, 150, 200][i % 3], upsKva: [20, 30, 40][i % 3], diperbarui: iso(0),
      status: "normal", alasan: [], pln: { ada: true, padamSejak: null },
      genset: { jalan: false, bbm: 96 - (i % 4) * 3, jamJalan: 1200 + i * 137, tegangan: 0, frekuensi: 0 }, ups: { baterai: 100, runtime: 27, beban: 46 + (i * 7) % 20 } };
    return Object.assign(c, ubah);
  };
  cabang = [
    dasar("MKS", "Makassar", 11, { status: "kritis", alasan: ["PLN padam, genset tidak menyala"], pln: { ada: false, padamSejak: iso(-14) },
      genset: { jalan: false, bbm: 93, jamJalan: 2707, tegangan: 0, frekuensi: 0 }, ups: { baterai: 44, runtime: 11, beban: 50 } }),
    dasar("BPN", "Balikpapan", 10, { status: "kritis", alasan: ["Sisa solar 17%"], genset: { jalan: false, bbm: 17, jamJalan: 2575, tegangan: 0, frekuensi: 0 } }),
    dasar("PLM", "Palembang", 1, { status: "waspada", alasan: ["Sisa solar 36%", "PLN padam, beban ditanggung genset"], pln: { ada: false, padamSejak: iso(-190) },
      genset: { jalan: true, bbm: 36, jamJalan: 1340, tegangan: 230, frekuensi: 50 } }),
    dasar("DPS", "Denpasar", 9, { status: "waspada", alasan: ["Beban UPS 85%"], ups: { baterai: 100, runtime: 15, beban: 85 } }),
    ...[["MDN", "Medan", 0], ["JKT", "Jakarta", 2], ["BKS", "Bekasi", 3], ["BDG", "Bandung", 4], ["SMG", "Semarang", 5], ["YOG", "Yogyakarta", 6], ["SBY", "Surabaya", 7], ["MLG", "Malang", 8]]
      .map(([k, n, i]) => dasar(k, n, i)),
  ];
  padam = [
    { nama: "Cabang Makassar", mulai: iso(-14), selesai: null, gensetMenyala: false },
    { nama: "Cabang Palembang", mulai: iso(-190), selesai: null, gensetMenyala: true },
    { nama: "Cabang Medan", mulai: iso(-540), selesai: iso(-420), gensetMenyala: true },
    { nama: "Cabang Balikpapan", mulai: iso(-840), selesai: iso(-540), gensetMenyala: true },
    { nama: "Cabang Semarang", mulai: iso(-1200), selesai: iso(-1155), gensetMenyala: true },
  ];
  nextPadam = null;
  const hitung = (s) => cabang.filter((c) => c.status === s).length;
  renderRingkasan({ total: 12, kritis: hitung("kritis"), waspada: hitung("waspada"), plnPadam: 2, gensetJalan: 1 });
  // pratinjau: penanda header sudah cukup, status koneksi tidak ditampilkan sebagai galat
  $("sumber").hidden = PRATINJAU;
  $("sumber").textContent = "API tidak terhubung. Menampilkan data contoh.";
  $("sumber").classList.add("putus");
  const b = $("banner");
  b.hidden = false;
  b.innerHTML = `Menampilkan data contoh karena API tidak terhubung (${esc(sebab)}). Jalankan <code>docker compose -p konsep-13 up -d</code> di folder proyek 13, lalu buka <code>http://localhost:18130</code>.`;
}

function riwayatContoh(c) {
  const x = Array.from({ length: 288 }, (_, i) => new Date(Date.now() - (287 - i) * 300000)), bbm = [], bat = [];
  let s = c.genset.bbm + (c.kode === "PLM" ? 19 : c.kode === "BPN" ? 30 : 0), b = 100;
  x.forEach((t, i) => {
    const m = (x.length - 1 - i) * 5; // menit sebelum sekarang
    if (c.kode === "PLM" && m <= 190) s -= 0.5;
    if (c.kode === "BPN" && m <= 840 && m > 540) s -= 0.5;
    if (c.kode === "MKS" && m <= 14) b -= 20;
    bbm.push(+s.toFixed(1));
    bat.push(Math.max(0, +b.toFixed(1)));
  });
  return x.map((t, i) => ({ ts: t.toISOString(), bbm: bbm[i], baterai: bat[i] }));
}

segarkan(true);
setInterval(() => { if (mode === "api") segarkan(false); }, SEGAR_MS);
