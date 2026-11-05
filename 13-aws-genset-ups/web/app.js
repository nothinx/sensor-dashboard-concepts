// Dasbor Genset & UPS Cabang: menarik data dari Lambda API (lewat /api, satu origin) tiap 10 detik.
// Daftar cabang dibaca per halaman memakai token `next` (LastEvaluatedKey DynamoDB).
// Tanpa API (file:// atau stack mati) dasbor memakai data contoh bawaan.

const API = "/api";
const SEGAR_MS = 10000;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ST = { kritis: "crit", waspada: "warn", normal: "ok" };
const ST_TEKS = { kritis: "Kritis", waspada: "Waspada", normal: "Normal" };
// posisi skematik [kolom, baris], kira-kira barat ke timur
const POS = { MDN: [1, 1], BPN: [5, 1], MKS: [6, 1], PLM: [1, 2], JKT: [2, 2], BKS: [3, 2], SMG: [4, 2], SBY: [5, 2], DPS: [6, 2], BDG: [2, 3], YOG: [4, 3], MLG: [5, 3] };

let mode = "api", cabang = [], pilih = null, padam = [], nextPadam = null;

const pukul = (iso) => hhmm(new Date(iso));
function durasi(dari, sampai) {
  const m = Math.max(0, Math.round(((sampai ? Date.parse(sampai) : Date.now()) - Date.parse(dari)) / 60000));
  return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} jam ${m % 60} mnt`;
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
    ["Cabang waspada", r.waspada, "", "solar, baterai, atau beban mendekati batas"],
    ["PLN padam sekarang", r.plnPadam, "", "cabang"],
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
    $("temuan").innerHTML = "<b>Semua cabang normal.</b> PLN menyala dan cadangan siap di 12 cabang.";
    btn.hidden = true;
    return;
  }
  const padamTeks = g.pln.ada ? "" : `PLN padam sejak pukul ${pukul(g.pln.padamSejak)}${g.genset.jalan ? "" : " dan genset tidak menyala"}; `;
  const sisa = !g.pln.ada && !g.genset.jalan ? `UPS tinggal ±${fmt(g.ups.runtime, 0)} menit.` : `${g.alasan.join(", ")}.`;
  $("temuan").innerHTML = `<b>${esc(g.kota)}: ${esc(padamTeks)}${esc(sisa)}</b> ${cabang.filter((c) => c.status !== "normal").length - 1} cabang lain perlu dipantau.`;
  btn.hidden = false;
  btn.textContent = `Buka ${g.kota}`;
  btn.onclick = () => pilihCabang(g.kode);
}

function ubin(c) {
  const [kol, bar] = POS[c.kode] || [];
  const bbmK = c.genset.bbm < 20 ? "crit" : c.genset.bbm < 40 ? "warn" : "";
  return `<button class="ubin ${c.pln.ada ? "" : "padam"}" type="button" aria-pressed="${c.kode === pilih}" data-kode="${c.kode}"
      style="grid-column:${kol};grid-row:${bar}" aria-label="${esc(c.nama)}, ${ST_TEKS[c.status]}">
    ${c.pln.ada ? "" : `<span class="padam-sejak">PLN padam sejak ${pukul(c.pln.padamSejak)}</span>`}
    <span class="kota">${esc(c.kota)}<span class="kode">${c.kode}</span></span>
    <span class="tangki ${bbmK}" style="--isi:${c.genset.bbm}" title="Solar ${fmt(c.genset.bbm)} %"><i></i><span>${fmt(c.genset.bbm, 0)}</span></span>
    <span class="info">
      <span>Genset <b>${c.genset.jalan ? "menyala" : "siaga"}</b></span>
      <span>UPS <b>${fmt(c.ups.baterai, 0)} %</b></span>
      <span class="baterai ${c.ups.baterai < 30 ? "crit" : ""}" style="--isi:${c.ups.baterai}"><i></i></span>
    </span>
    ${st(ST[c.status], ST_TEKS[c.status])}
  </button>`;
}

function renderPeta() {
  $("peta").innerHTML = cabang.map(ubin).join("");
  $("peta").removeAttribute("aria-busy");
}

async function renderDetail() {
  const c = cabang.find((x) => x.kode === pilih);
  if (!c) return;
  const d = $("detail");
  d.innerHTML = `
    <div><h2>${esc(c.nama)}</h2><div style="margin-top:8px">${st(ST[c.status], ST_TEKS[c.status])}</div></div>
    ${c.alasan.length ? `<ul class="alasan">${c.alasan.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : `<p class="sub">Tidak ada catatan; semua nilai dalam batas.</p>`}
    <div class="dk">
      <div><div class="l">Sumber listrik</div><div class="v" style="font-size:16px">${c.pln.ada ? "PLN" : c.genset.jalan ? "Genset" : "UPS saja"}</div></div>
      <div><div class="l">Solar genset</div><div class="v">${fmt(c.genset.bbm)}<small>%</small></div></div>
      <div><div class="l">Tegangan · frekuensi</div><div class="v">${c.genset.jalan ? `${fmt(c.genset.tegangan, 0)}<small>V</small> ${fmt(c.genset.frekuensi)}<small>Hz</small>` : "<small>genset siaga</small>"}</div></div>
      <div><div class="l">Jam jalan genset</div><div class="v">${fmt(c.genset.jamJalan, 0)}<small>jam</small></div></div>
      <div><div class="l">Baterai UPS</div><div class="v">${fmt(c.ups.baterai)}<small>%</small></div></div>
      <div><div class="l">Runtime UPS · beban</div><div class="v">${fmt(c.ups.runtime, 0)}<small>mnt</small> ${fmt(c.ups.beban, 0)}<small>%</small></div></div>
    </div>
    <div>
      <h2 style="font-size:14px">Solar dan baterai UPS, 24 jam</h2>
      <div class="legend" style="margin:8px 0"><span><i style="background:var(--s1)"></i>Solar</span><span><i style="background:var(--s2)"></i>Baterai UPS</span></div>
      <div id="tren" data-label="Solar dan baterai UPS ${esc(c.kota)}, 24 jam"><p class="memuat">Memuat riwayat…</p></div>
    </div>
    <p class="sub">Diperbarui pukul ${pukul(c.diperbarui)} · genset ${c.gensetKva} kVA · UPS ${c.upsKva} kVA</p>`;
  try {
    const rw = mode === "api" ? (await ambil(`/cabang/${c.kode}/riwayat?jam=24`)).data : riwayatContoh(c);
    if (!rw.length) { $("tren").innerHTML = `<p class="kosong">Belum ada riwayat untuk cabang ini.</p>`; return; }
    lineChart($("tren"), {
      x: rw.map((p) => new Date(p.ts)), unit: "%", min: 0, max: 100, dec: 0, h: 200,
      series: [{ name: "Solar", color: "var(--s1)", data: rw.map((p) => p.bbm) }, { name: "Baterai", color: "var(--s2)", data: rw.map((p) => p.baterai) }],
      bands: [{ y: 20, label: "batas kritis 20 %", color: "var(--crit)" }],
    });
  } catch (e) {
    $("tren").innerHTML = `<p class="kosong">Riwayat gagal dimuat (${esc(e.message)}). Pilih cabang lagi untuk mencoba ulang.</p>`;
  }
}

function renderPadam() {
  $("padam").innerHTML = padam.length ? padam.map((p) => `<tr>
      <td>${esc(p.nama)}</td><td class="num">${new Date(p.mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, ${pukul(p.mulai)}</td>
      <td>${p.selesai ? `<span class="num">${pukul(p.selesai)}</span>` : st("warn", "Masih padam")}</td>
      <td class="n num">${durasi(p.mulai, p.selesai)}</td>
      <td>${p.gensetMenyala ? st("ok", "Menyala") : st("crit", "Tidak menyala")}</td></tr>`).join("")
    : `<tr><td colspan="5" class="kosong">Tidak ada kejadian PLN padam dalam riwayat.</td></tr>`;
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
    $("sumber").textContent = `Tersambung ke API · diperbarui pukul ${hhmm(new Date())}`;
    $("sumber").classList.remove("putus");
    $("banner").hidden = true;
  } catch (e) {
    if (mode === "api" && !awal) { // sempat tersambung: pertahankan data terakhir
      $("sumber").textContent = `Koneksi API terputus (${e.message}); mencoba lagi tiap 10 detik`;
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
  } catch (e) { $("btnLagi").textContent = `Gagal memuat (${e.message}); coba lagi`; }
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
    dasar("BPN", "Balikpapan", 10, { status: "kritis", alasan: ["Solar 17 %"], genset: { jalan: false, bbm: 17, jamJalan: 2575, tegangan: 0, frekuensi: 0 } }),
    dasar("PLM", "Palembang", 1, { status: "waspada", alasan: ["Solar 36 %", "PLN padam, beban di genset"], pln: { ada: false, padamSejak: iso(-190) },
      genset: { jalan: true, bbm: 36, jamJalan: 1340, tegangan: 230, frekuensi: 50 } }),
    dasar("DPS", "Denpasar", 9, { status: "waspada", alasan: ["Beban UPS 85 %"], ups: { baterai: 100, runtime: 15, beban: 85 } }),
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
  $("sumber").textContent = "Data contoh bawaan";
  $("sumber").classList.add("putus");
  const b = $("banner");
  b.hidden = false;
  b.innerHTML = `Mode data contoh: API tidak terhubung (${esc(sebab)}). Jalankan <code>docker compose -p konsep-13 up -d</code> di folder proyek 13, lalu buka <code>http://localhost:18130</code>.`;
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
