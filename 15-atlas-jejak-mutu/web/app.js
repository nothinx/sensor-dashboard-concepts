// Dasbor Jejak Mutu: menarik data dari API (/api, satu origin dengan dasbor) yang membaca MongoDB Atlas.
// Cari lewat Atlas Search, riwayat uji dari time series collection, umpan kejadian dari change stream.
// Tanpa API (dibuka via file://), semua bagian diisi data contoh bawaan.

const STASIUN = ["PERAKITAN", "UJI-FUNGSI", "UJI-AKHIR", "KEMAS"];
const NAMA_ST = { PERAKITAN: "Perakitan", "UJI-FUNGSI": "Uji fungsi", "UJI-AKHIR": "Uji akhir", KEMAS: "Kemas" };
const NAMA_NILAI = { daya_w: ["Daya", "W"], arus_kompresor_a: ["Arus kompresor", "A"], hipot_ma: ["Arus bocor hipot", "mA"] };
const STATUS = { "di lini": ["off", "Di lini"], ditahan: ["crit", "Ditahan"], dikemas: ["ok", "Dikemas"] };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const jam = (s) => hhmm(new Date(s));
const tanggal = (s) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

let mode = "api", CONTOH = null, aktif = null;

async function api(path) {
  if (mode === "contoh") return dariContoh(path);
  const r = await fetch("/api" + path, { signal: AbortSignal.timeout(6000) });
  const isi = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(isi.galat || `HTTP ${r.status}`), { status: r.status });
  return isi;
}

// ---------- cari ----------
async function cari(q) {
  const g = $("cari-galat");
  g.hidden = true;
  q = q.trim();
  if (q.length < 2) { g.textContent = "Ketik minimal 2 karakter."; g.hidden = false; return; }
  const ol = $("hasil");
  ol.hidden = false;
  ol.innerHTML = `<li class="kosong">Mencari…</li>`;
  try {
    const { hasil } = await api(`/cari?q=${encodeURIComponent(q)}`);
    if (hasil.length === 1) { ol.hidden = true; return buka(hasil[0].serial); }
    ol.innerHTML = hasil.length ? hasil.map((h) => `<li><button type="button" data-serial="${esc(h.serial)}">
        <span class="serial">${esc(h.serial)}</span>
        <span><span>${esc(h.model)}</span><br><span class="cuplikan">${esc(h.cuplikan || `Stasiun terakhir: ${NAMA_ST[h.stasiun_terakhir]}`)}</span></span>
        ${st(...STATUS[h.status])}</button></li>`).join("")
      : `<li class="kosong">Tidak ada unit yang cocok dengan "${esc(q)}". Periksa nomor seri atau coba kata lain dari catatan QC.</li>`;
  } catch (e) {
    ol.innerHTML = `<li class="kosong">Pencarian gagal: ${esc(e.message)} Coba lagi beberapa detik lagi.</li>`;
  }
}

// ---------- unit ----------
async function buka(serial) {
  aktif = serial;
  const el = $("unit");
  el.innerHTML = `<p class="memuat">Memuat ${esc(serial)}…</p>`;
  try {
    tampilUnit(await api(`/unit/${encodeURIComponent(serial)}`));
  } catch (e) {
    el.innerHTML = `<p class="kosong">${e.status === 404 ? `Nomor seri ${esc(serial)} tidak ditemukan. Periksa label pada unit.` : `Unit tidak bisa dimuat: ${esc(e.message)}`}</p>`;
  }
  document.querySelectorAll("#hasil button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.serial === serial)));
}

function temuan(u) {
  const gagal = u.langkah.find((l) => l.status === "gagal");
  if (gagal) {
    const p = gagal.percobaan[gagal.percobaan.length - 1];
    return `<b>Ditahan di ${NAMA_ST[gagal.stasiun].toLowerCase()} sejak pukul ${jam(gagal.waktu)}: ${esc(p.kode_cacat)}.</b> ${esc(p.catatan)}`;
  }
  const ulang = u.langkah.filter((l) => l.percobaan && l.percobaan.length > 1);
  if (u.status === "dikemas") return ulang.length
    ? `<b>Lulus semua stasiun dan sudah dikemas,</b> setelah perbaikan di ${ulang.map((l) => NAMA_ST[l.stasiun].toLowerCase()).join(" dan ")}.`
    : "<b>Lulus semua stasiun pada percobaan pertama dan sudah dikemas.</b>";
  const berikut = u.langkah.find((l) => l.status === "belum");
  return `<b>Masih di lini, berikutnya ${NAMA_ST[berikut.stasiun].toLowerCase()}.</b> Belum ada cacat tercatat.`;
}

function tampilUnit(u) {
  const langkah = u.langkah.map((l, i) => {
    if (l.status === "belum") return `<li class="langkah belum"><span class="titik">${i + 1}</span><h3>${NAMA_ST[l.stasiun]}</h3><p class="waktu">Belum sampai</p></li>`;
    const akhir = l.percobaan[l.percobaan.length - 1];
    const nilai = Object.entries(l.nilai || {}).map(([k, v]) => `<dt>${NAMA_NILAI[k]?.[0] ?? esc(k)}</dt><dd>${fmt(v, 2, false)} ${NAMA_NILAI[k]?.[1] ?? ""}</dd>`).join("");
    const stiker = l.status === "lulus"
      ? `<span class="stiker lulus"><b>QC lulus</b>${l.stasiun} · ${esc(l.operator)}</span>`
      : `<span class="stiker gagal"><b>Ditahan</b>${l.stasiun} · ${esc(akhir.kode_cacat)}</span>`;
    const riwayat = l.percobaan.length > 1 ? `<div class="percobaan">${l.percobaan.map((p) =>
      `<p>${jam(p.waktu)} ${p.hasil === "gagal" ? `gagal, ${esc(p.kode_cacat)}` : "lulus"}</p>`).join("")}</div>` : "";
    return `<li class="langkah ${l.status}"><span class="titik">${i + 1}</span><h3>${NAMA_ST[l.stasiun]}</h3>
      <p class="waktu">${tanggal(l.waktu)}, pukul ${jam(l.waktu)}</p>
      ${nilai ? `<dl><dt>Operator</dt><dd>${esc(l.operator)}</dd>${nilai}</dl>` : `<dl><dt>Operator</dt><dd>${esc(l.operator)}</dd></dl>`}
      ${stiker}${riwayat}</li>`;
  }).join("");
  const catatan = u.catatan_qc.length ? `<section class="catatan"><h2>Catatan QC</h2><ol>${u.catatan_qc.map((c) =>
    `<li><span class="mono">${tanggal(c.waktu)}, ${jam(c.waktu)}</span><span>${NAMA_ST[c.stasiun]}</span><span>${esc(c.teks)}</span></li>`).join("")}</ol></section>` : "";
  $("unit").innerHTML = `<div class="unit-h"><h2 class="serial">${esc(u.serial)}</h2>${st(...STATUS[u.status])}</div>
    <p class="meta">${esc(u.model)} · ${esc(u.lini)} · mulai dirakit ${tanggal(u.dibuat_pada)}, pukul ${jam(u.dibuat_pada)}</p>
    <p class="temuan">${temuan(u)}</p>
    <ol class="jalur" aria-label="Perjalanan unit melewati 4 stasiun">${langkah}</ol>${catatan}`;
}

// ---------- samping ----------
async function segarkan() {
  try {
    const [r, c, k] = await Promise.all([api("/ringkasan"), api("/cacat?hari=7"), api("/kejadian")]);
    $("kpi-waktu").textContent = `pukul ${jam(r.diperbarui)}`;
    $("kpis").innerHTML = [["Unit ditahan", r.ditahan, r.ditahan ? "jawab" : ""], ["Dikemas hari ini", r.dikemas_hari_ini, ""],
      ["Uji hari ini", r.uji_hari_ini, ""], ["Gagal hari ini", r.gagal_hari_ini, ""]]
      .map(([l, v, cls]) => `<div class="kpi"><div class="l">${l}</div><div class="v ${cls}">${fmt(v, 0)}</div></div>`).join("");
    const maks = Math.max(1, ...c.cacat.map((x) => x.jumlah));
    $("cacat").innerHTML = c.cacat.length ? c.cacat.map((x) => `<li><span class="kode">${esc(x.kode)}</span>
      <span class="bar" role="img" aria-label="${x.jumlah} kejadian"><i style="width:${(x.jumlah / maks) * 100}%"></i></span>
      <span class="n">${x.jumlah}</span><span class="contoh">${esc(x.contoh)}</span></li>`).join("")
      : `<li class="kosong">Tidak ada uji gagal dalam 7 hari terakhir.</li>`;
    $("umpan").innerHTML = k.kejadian.length ? k.kejadian.slice(0, 10).map((e) => `<li><time datetime="${esc(e.waktu)}">${jam(e.waktu)}</time>
      <span><button type="button" data-serial="${esc(e.serial)}">${esc(e.serial)}</button>
      <span class="ket">${e.status === "ditahan" ? `ditahan di ${NAMA_ST[e.stasiun].toLowerCase()}, ${esc(e.kode_cacat)}`
        : e.status === "dikemas" ? "dikemas" : `lulus ${NAMA_ST[e.stasiun].toLowerCase()}`}</span></span></li>`).join("")
      : `<li class="kosong">Belum ada kejadian sejak API berjalan.</li>`;
    const tahan = r.sorotan.filter((s) => s.ditahan), lain = r.sorotan.filter((s) => !s.ditahan);
    const chip = (s) => `<button class="chip-unit" type="button" data-serial="${esc(s.serial)}">${esc(s.serial)}</button>`;
    $("ditahan").innerHTML = (tahan.length ? `<span>Sedang ditahan:</span>${tahan.map(chip).join("")}` : "")
      + (lain.length ? `<span>Cacat terbaru, sudah diperbaiki:</span>${lain.map(chip).join("")}` : "");
    if (mode === "api") { $("sumber").className = "sumber live"; $("sumber").textContent = `Terhubung · pukul ${jam(r.diperbarui)}`; }
    return r;
  } catch (e) {
    $("sumber").className = "sumber";
    $("sumber").textContent = `Gagal memperbarui: ${e.message}`;
  }
}

// ---------- data contoh ----------
function contoh() {
  const t = (jamMundur) => new Date(NOW - jamMundur * 36e5).toISOString();
  const ujian = (op, nilai, jamM, extra = {}) => ({ waktu: t(jamM), hasil: "lulus", operator: op, nilai, ...extra });
  const unit = {
    "TV43-2611-004127": {
      serial: "TV43-2611-004127", model: "TV LED 43 inci", lini: "Lini TV 1", status: "ditahan", dibuat_pada: t(3.2),
      catatan_qc: [{ waktu: t(1.1), stasiun: "UJI-FUNGSI", teks: "Garis vertikal tipis pada panel saat uji pola warna merah" }],
      langkah: [
        { stasiun: "PERAKITAN", status: "lulus", waktu: t(3.2), operator: "OP-014", nilai: {}, percobaan: [{ waktu: t(3.2), hasil: "lulus" }] },
        { stasiun: "UJI-FUNGSI", status: "gagal", waktu: t(1.1), operator: "OP-020", nilai: { daya_w: 71.4 },
          percobaan: [{ waktu: t(1.1), hasil: "gagal", kode_cacat: "PNL-02", catatan: "Garis vertikal tipis pada panel saat uji pola warna merah" }] },
        { stasiun: "UJI-AKHIR", status: "belum" }, { stasiun: "KEMAS", status: "belum" }],
    },
    "KL2P-2611-004102": {
      serial: "KL2P-2611-004102", model: "Kulkas 2 pintu", lini: "Lini kulkas", status: "dikemas", dibuat_pada: t(6),
      catatan_qc: [{ waktu: t(4.4), stasiun: "UJI-AKHIR", teks: "Karet pintu tidak rapat, celah 2 mm di sisi engsel" }],
      langkah: [
        { stasiun: "PERAKITAN", status: "lulus", waktu: t(6), operator: "OP-011", nilai: {}, percobaan: [{ waktu: t(6), hasil: "lulus" }] },
        { stasiun: "UJI-FUNGSI", status: "lulus", waktu: t(5.1), operator: "OP-023", nilai: { arus_kompresor_a: 1.12 }, percobaan: [{ waktu: t(5.1), hasil: "lulus" }] },
        { stasiun: "UJI-AKHIR", status: "lulus", waktu: t(3.6), operator: "OP-031", nilai: { hipot_ma: 0.41 },
          percobaan: [{ waktu: t(4.4), hasil: "gagal", kode_cacat: "SEG-01", catatan: "Karet pintu tidak rapat, celah 2 mm di sisi engsel" }, { waktu: t(3.6), hasil: "lulus" }] },
        { stasiun: "KEMAS", status: "lulus", waktu: t(2.9), operator: "OP-011", nilai: {}, percobaan: [{ waktu: t(2.9), hasil: "lulus" }] }],
    },
    "TV50-2611-004133": {
      serial: "TV50-2611-004133", model: "TV LED 50 inci", lini: "Lini TV 2", status: "di lini", dibuat_pada: t(1.4), catatan_qc: [],
      langkah: [
        { stasiun: "PERAKITAN", status: "lulus", waktu: t(1.4), operator: "OP-014", nilai: {}, percobaan: [{ waktu: t(1.4), hasil: "lulus" }] },
        { stasiun: "UJI-FUNGSI", status: "lulus", waktu: t(0.5), operator: "OP-020", nilai: { daya_w: 88.2 }, percobaan: [{ waktu: t(0.5), hasil: "lulus" }] },
        { stasiun: "UJI-AKHIR", status: "belum" }, { stasiun: "KEMAS", status: "belum" }],
    },
    "TV32-2611-004118": {
      serial: "TV32-2611-004118", model: "TV LED 32 inci", lini: "Lini TV 1", status: "ditahan", dibuat_pada: t(4.8),
      catatan_qc: [{ waktu: t(2.2), stasiun: "UJI-AKHIR", teks: "Sensor remote tidak merespons dari jarak 5 meter" }],
      langkah: [
        { stasiun: "PERAKITAN", status: "lulus", waktu: t(4.8), operator: "OP-014", nilai: {}, percobaan: [{ waktu: t(4.8), hasil: "lulus" }] },
        { stasiun: "UJI-FUNGSI", status: "lulus", waktu: t(3.5), operator: "OP-020", nilai: { daya_w: 52.6 }, percobaan: [{ waktu: t(3.5), hasil: "lulus" }] },
        { stasiun: "UJI-AKHIR", status: "gagal", waktu: t(2.2), operator: "OP-031", nilai: { hipot_ma: 0.38 },
          percobaan: [{ waktu: t(2.2), hasil: "gagal", kode_cacat: "IR-01", catatan: "Sensor remote tidak merespons dari jarak 5 meter" }] },
        { stasiun: "KEMAS", status: "belum" }],
    },
  };
  const kej = (j, serial, stasiun, status, kode) => ({ waktu: t(j), serial, model: unit[serial]?.model ?? "TV LED 43 inci", stasiun, status, kode_cacat: kode ?? null });
  return {
    unit,
    ringkasan: { diperbarui: NOW.toISOString(), ditahan: 7, di_lini: 38, dikemas_hari_ini: 64, uji_hari_ini: 271, gagal_hari_ini: 12,
      sorotan: [{ serial: "TV43-2611-004127", ditahan: true }, { serial: "TV32-2611-004118", ditahan: true }, { serial: "KL2P-2611-004102", ditahan: false }] },
    cacat: { hari: 7, total_uji: 2417, cacat: [
      { kode: "PNL-02", jumlah: 31, contoh: "Garis vertikal tipis pada panel saat uji pola warna merah" },
      { kode: "SEG-01", jumlah: 22, contoh: "Karet pintu tidak rapat, celah 2 mm di sisi engsel" },
      { kode: "KSM-02", jumlah: 17, contoh: "Goresan halus di bezel bawah, panjang sekitar 1 cm" },
      { kode: "IR-01", jumlah: 12, contoh: "Sensor remote tidak merespons dari jarak 5 meter" },
      { kode: "KMP-03", jumlah: 9, contoh: "Kompresor berdengung keras saat start pertama" },
      { kode: "AUD-01", jumlah: 6, contoh: "Suara speaker kiri pecah pada volume di atas 80" }] },
    kejadian: [kej(0.05, "TV50-2611-004133", "UJI-FUNGSI", "di lini"), kej(0.2, "TV43-2611-004135", "PERAKITAN", "di lini"),
      kej(1.1, "TV43-2611-004127", "UJI-FUNGSI", "ditahan", "PNL-02"), kej(1.3, "KL2P-2611-004110", "KEMAS", "dikemas"),
      kej(2.2, "TV32-2611-004118", "UJI-AKHIR", "ditahan", "IR-01"), kej(2.9, "KL2P-2611-004102", "KEMAS", "dikemas"),
      kej(3.6, "KL2P-2611-004102", "UJI-AKHIR", "di lini")],
  };
}
function dariContoh(path) {
  const u = new URL(path, "http://contoh");
  if (u.pathname === "/ringkasan") return CONTOH.ringkasan;
  if (u.pathname === "/cacat") return CONTOH.cacat;
  if (u.pathname === "/kejadian") return { kejadian: CONTOH.kejadian };
  if (u.pathname.startsWith("/unit/")) {
    const x = CONTOH.unit[decodeURIComponent(u.pathname.slice(6))];
    if (!x) throw Object.assign(new Error("tidak ditemukan"), { status: 404 });
    return x;
  }
  if (u.pathname === "/cari") {
    const q = u.searchParams.get("q").toLowerCase();
    return { hasil: Object.values(CONTOH.unit).filter((x) => [x.serial, x.model, ...x.catatan_qc.map((c) => c.teks)].join(" ").toLowerCase().includes(q))
      .map((x) => ({ serial: x.serial, model: x.model, status: x.status, stasiun_terakhir: x.langkah.filter((l) => l.status !== "belum").pop().stasiun,
        cuplikan: x.catatan_qc[0]?.teks ?? null })) };
  }
  throw new Error("rute contoh tidak dikenal");
}

// ---------- mulai ----------
async function mulai() {
  $("form-cari").addEventListener("submit", (e) => { e.preventDefault(); cari($("q").value); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-serial]");
    if (b) buka(b.dataset.serial);
  });
  try {
    if (TANPA_API) throw new Error("dasbor dibuka langsung dari berkas");
    await api("/health");
  } catch (e) {
    mode = "contoh";
    CONTOH = contoh();
    $("banner").hidden = false;
    $("banner").textContent = `Mode data contoh: API tidak terhubung (${e.message}). Jalankan "docker compose -p konsep-15 up -d" di folder 15-atlas-jejak-mutu lalu buka http://localhost:18150.`;
    $("sumber").textContent = "Data contoh bawaan";
  }
  const r = await segarkan();
  const awal = r?.sorotan[0]?.serial;
  if (awal) buka(awal);
  else $("unit").innerHTML = `<p class="kosong">Ketik nomor seri di kolom cari untuk melihat perjalanan unit.</p>`;
  if (mode === "api") setInterval(segarkan, 5000);
}
mulai();
