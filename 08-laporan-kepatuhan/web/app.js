// Dasbor Laporan Kepatuhan Mutu: REST /api/v1 (FastAPI + PostgreSQL), laporan disusun asinkron.
const API = "/api/v1";
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const STATUS = { antri: "masuk antrean", proses: "mulai disusun", selesai: "selesai disusun", gagal: "gagal disusun" };
const JENIS = { kepatuhan: "Kepatuhan lingkungan harian", jejak_audit: "Ekspor jejak audit" };
let laporan = [], cursorLap = null, aktif = false, lembar = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tanggal = (s) => new Date(`${s}T00:00:00`);
// rentang tanggal tanpa tahun ganda: "31 Oktober sampai 6 November 2026"; n = 3 untuk bulan singkat
function rentang(a, b, n) {
  const x = tanggal(a), y = tanggal(b), s = (d) => `${d.getDate()} ${BULAN[d.getMonth()].slice(0, n)}`;
  return x.getFullYear() === y.getFullYear() ? `${s(x)} sampai ${s(y)} ${y.getFullYear()}` : `${s(x)} ${x.getFullYear()} sampai ${s(y)} ${y.getFullYear()}`;
}
const singkat = (d) => `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
function mingguIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}

async function api(path, opt) {
  const r = await fetch(API + path, opt);
  let body = null;
  try { body = await r.json(); } catch { /* jawaban bukan JSON */ }
  if (!r.ok) {
    const d = body?.detail;
    const pesan = Array.isArray(d) ? d.map((x) => x.msg.replace(/^Value error, /, "")).join(" ") : d || `HTTP ${r.status}`;
    throw new Error(pesan);
  }
  return body;
}

// ---------- lembar kepatuhan ----------
// dibandingkan pada nilai yang tampil (1 desimal) supaya "95,0" tidak diberi warna kritis
const kelas = (p, amb) => { const r = Math.round(p * 10) / 10; return r < 95 ? "vlo" : r < amb ? "lo" : ""; };
function renderKepatuhan(k) {
  lembar = k;
  const amb = k.ambang_persen, hariIni = iso(new Date());
  const tgl = k.area[0]?.harian.map((h) => h.tanggal) ?? [];
  $("judul").textContent = `Kepatuhan lingkungan produksi, minggu ke-${mingguIso(tanggal(k.sampai))}`;
  $("m-periode").textContent = rentang(k.dari, k.sampai);
  $("m-ambang").textContent = `${fmt(amb, 1)}% waktu dalam batas`;
  $("cmp-h").innerHTML = `<tr><th scope="col">Area</th>${tgl.map((t) => {
    const d = tanggal(t);
    return t === hariIni ? `<th scope="col" class="today"><b>Hari ini</b>${singkat(d)}</th>` : `<th scope="col"><b>${HARI[d.getDay()]}</b>${singkat(d)}</th>`;
  }).join("")}<th scope="col" class="total"><b>Periode</b>${tgl.length} hari</th></tr>`;
  const sel = (p) => p == null ? `<td class="na" title="Tidak ada data">-</td>`
    : `<td class="${kelas(p, amb)}">${fmt(p, 1)}</td>`;
  $("cmp-b").innerHTML = k.area.map((a) => `<tr><td>${esc(a.nama)}</td>${a.harian.map((h) => sel(h.persen)).join("")}
    ${sel(a.persen_periode).replace("<td class=\"", "<td class=\"total ")}</tr>`).join("");
  const gagal = k.area.filter((a) => a.persen_periode != null && a.persen_periode < amb);
  const n = k.area.length;
  $("temuan").innerHTML = gagal.length
    ? `<b>Dalam ${tgl.length} hari terakhir, ${n - gagal.length} dari ${n} area memenuhi syarat.</b> ${gagal.map((a) => `${esc(a.nama)} (${fmt(a.persen_periode, 1)}%)`).join(" dan ")} di bawah ambang dan perlu dijelaskan dalam laporan mingguan.`
    : `<b>Dalam ${tgl.length} hari terakhir, semua ${n} area memenuhi syarat.</b> Lembar siap diperiksa Manajer Mutu.`;
  const now = new Date();
  $("dicetak").textContent = `${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}, pukul ${hhmm(now)}`;
}

// ---------- daftar laporan ----------
function itemLaporan(l) {
  const chip = l.status === "selesai" ? st("ok", "Selesai") : l.status === "gagal" ? st("crit", "Gagal")
    : st("off", l.status === "antri" ? "Antre" : `Disusun ${l.progres}%`);
  const dibuat = new Date(l.dibuat_pada);
  let bawah = "";
  if (l.status === "selesai") bawah = `<a href="${esc(l.url_berkas)}" download>Unduh berkas ${l.format.toUpperCase()}</a>`;
  else if (l.status === "gagal") bawah = `<p class="err">${esc(l.pesan_galat)}</p>`;
  else bawah = `<div class="bar" role="progressbar" aria-valuenow="${l.progres}" aria-valuemin="0" aria-valuemax="100" aria-label="Kemajuan penyusunan ${esc(l.nomor)}"><i style="transform:scaleX(${l.progres / 100})"></i></div>`;
  return `<li><div class="row"><span class="id">${esc(l.nomor)}</span>${chip}</div>
    <div class="meta">${JENIS[l.jenis] ?? esc(l.jenis)}, ${l.area ? esc(l.area) : "semua area"}, ${rentang(l.dari, l.sampai, 3)}</div>
    <div class="meta">Diminta ${esc(l.dibuat_oleh)}, ${singkat(dibuat)} pukul ${hhmm(dibuat)}</div>${bawah}</li>`;
}
function renderLaporan() {
  $("l-lap").innerHTML = laporan.length ? laporan.map(itemLaporan).join("")
    : `<li class="empty">Belum ada laporan. Terbitkan yang pertama lewat formulir di atas.</li>`;
  $("lebih").hidden = !cursorLap;
  // nomor hanya dipakai bila ada laporan terbit untuk periode dan cakupan yang sama dengan lembar ini
  const terbaru = lembar && laporan.find((l) => l.status === "selesai" && l.jenis === "kepatuhan" && !l.area && l.dari === lembar.dari && l.sampai === lembar.sampai);
  $("m-nomor").textContent = terbaru ? terbaru.nomor : "Draf, nomor diberikan saat terbit";
  $("m-nomor").className = terbaru ? "id" : "draf";
  $("stamp-no").textContent = terbaru ? `Nomor dokumen ${terbaru.nomor}` : "Nomor dokumen belum terbit";
}
async function pantau() {
  // satu putaran polling untuk semua laporan yang belum selesai
  if (aktif) return;
  aktif = true;
  try {
    while (laporan.some((l) => l.status === "antri" || l.status === "proses")) {
      await new Promise((r) => setTimeout(r, 800));
      for (const l of laporan.filter((x) => x.status === "antri" || x.status === "proses")) {
        Object.assign(l, await api(`/laporan/${l.id}`));
      }
      renderLaporan();
    }
    await muatAudit();
  } catch (e) {
    $("conn").textContent = `Status laporan tidak terpantau (${e.message}). Muat ulang halaman.`;
  } finally {
    aktif = false;
  }
}

// ---------- jejak audit ----------
function cerita(a) {
  const p = a.perubahan || {};
  if (a.tabel === "laporan") {
    if (a.aksi === "INSERT") return `Membuat laporan <span class="id">${esc(a.rekaman)}</span>`;
    if (a.aksi === "UPDATE") return `Laporan <span class="id">${esc(a.rekaman)}</span> ${STATUS[p.status] ?? "diubah"}`;
    return `Menghapus laporan <span class="id">${esc(a.rekaman)}</span>`;
  }
  if (a.tabel === "batas") return a.aksi === "INSERT" ? `Menetapkan batas sensor nomor ${esc(p.sensor_id)}` : `${a.aksi === "UPDATE" ? "Mengubah" : "Menghapus"} batas nomor ${esc(a.rekaman)}`;
  return `${esc(a.aksi)} ${esc(a.tabel)} ${esc(a.rekaman)}`;
}
function renderAudit(data) {
  const hariIni = new Date().toDateString();
  $("l-audit").innerHTML = data.length ? data.map((a) => {
    const w = new Date(a.waktu);
    const aktor = a.aktor === "sistem" ? "Sistem" : a.aktor;
    return `<li><time datetime="${esc(a.waktu)}">${w.toDateString() === hariIni ? hhmm(w) : singkat(w)}</time>
      <div><span class="who">${esc(aktor)}</span>${cerita(a)}</div></li>`;
  }).join("") : `<li class="empty">Belum ada catatan audit.</li>`;
}
async function muatAudit() {
  renderAudit((await api("/audit?limit=8")).data);
}

// ---------- formulir ----------
function siapkanForm(areas) {
  const f = $("form"), now = new Date(), awal = new Date(now - 6 * 864e5);
  f.dari.value = iso(awal);
  f.sampai.value = iso(now);
  $("f-area").insertAdjacentHTML("beforeend", areas.map((a) => `<option value="${esc(a.kode)}">${esc(a.nama)}</option>`).join(""));
  const label = () => { $("kirim").textContent = `Terbitkan laporan ${f.format.value.toUpperCase()}`; };
  f.addEventListener("change", label);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("form-err");
    err.hidden = true;
    if (!f.dari.value || !f.sampai.value) return tampilGalat("Isi tanggal mulai dan tanggal akhir.");
    if (f.sampai.value < f.dari.value) return tampilGalat("Tanggal akhir lebih awal dari tanggal mulai. Tukar kedua tanggal.");
    if (!f.aktor.value.trim()) return tampilGalat("Isi nama penyusun. Nama ini tercatat di jejak audit.");
    const btn = $("kirim");
    btn.disabled = true;
    btn.textContent = "Menerbitkan…";
    try {
      const l = await api("/laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Aktor": f.aktor.value.trim() },
        body: JSON.stringify({ jenis: f.jenis.value, area: f.area.value || null, dari: f.dari.value, sampai: f.sampai.value, format: f.format.value }),
      });
      laporan.unshift(l);
      renderLaporan();
      pantau();
    } catch (ex) {
      tampilGalat(`Laporan tidak bisa diterbitkan: ${ex.message}`);
    } finally {
      btn.disabled = false;
      label();
    }
  });
}
function tampilGalat(t) {
  const err = $("form-err");
  err.textContent = t;
  err.hidden = false;
}

// ---------- mode data contoh ----------
function contoh() {
  const now = new Date();
  const tgl = Array.from({ length: 7 }, (_, i) => iso(new Date(now - (6 - i) * 864e5)));
  const A = [["SMT Line 1", [100, 99.6, 100, 100, 99.3, 100, 100]], ["SMT Line 2", [100, 100, 100, 99.8, 100, 99.1, 79.2]],
    ["Perakitan TV", [100, 100, 100, 100, 100, 100, 100]], ["Perakitan kulkas", [99.7, 100, 100, 100, 100, 100, 100]],
    ["Kompresor & utilitas", [100, 99.4, 99, 100, 96.5, 99.2, 91.7]], ["Gudang komponen", [100, 100, 100, 100, 100, 100, 100]],
    ["Cold storage B", [100, 100, 100, 98.3, 100, 100, 99.4]], ["Ruang server", [100, 100, 100, 100, 100, 100, 100]]];
  return {
    dari: tgl[0], sampai: tgl[6], ambang_persen: 99,
    area: A.map(([nama, v]) => ({ nama, harian: v.map((p, i) => ({ tanggal: tgl[i], persen: p })), persen_periode: v.reduce((a, b) => a + b) / v.length })),
  };
}
function modeContoh(sebab) {
  renderKepatuhan(contoh());
  $("banner").hidden = false;
  $("banner").innerHTML = `Menampilkan data contoh karena ${esc(sebab)}. Formulir, daftar laporan, dan jejak audit butuh API. Jalankan <code>docker compose -p konsep-08 up -d</code>, lalu buka <code>http://localhost:18080</code>.`;
  const tanda = document.querySelector("[data-pratinjau]");
  tanda.hidden = false;
  tanda.textContent = PRATINJAU ? "Pratinjau, data contoh" : "Data contoh";
  $("conn").textContent = PRATINJAU ? "" : "API tidak tersambung";
  // daftar laporan & jejak audit contoh, supaya pratinjau tanpa API tetap terisi
  const now = new Date(), jam = (h) => new Date(now - h * 36e5).toISOString(), hr = (d) => iso(new Date(now - d * 864e5));
  laporan = [
    { nomor: "QA/LK/2026/11/0004", status: "proses", progres: 60, jenis: "kepatuhan", area: null, dari: hr(6), sampai: hr(0), dibuat_oleh: "Supervisor QC", dibuat_pada: jam(0.02) },
    { nomor: "QA/LK/2026/11/0003", status: "gagal", jenis: "kepatuhan", area: "SMT Line 2", dari: "2025-01-01", sampai: "2025-01-31", dibuat_oleh: "Manajer Mutu", dibuat_pada: jam(2),
      pesan_galat: "Tidak ada data untuk periode ini. Data tersedia mulai 6\u00a0Oktober 2026, pilih periode lain." },
    { nomor: "QA/LK/2026/11/0002", status: "selesai", format: "csv", url_berkas: "#", jenis: "kepatuhan", area: "Kompresor & utilitas", dari: hr(30), sampai: hr(0), dibuat_oleh: "Supervisor QC", dibuat_pada: jam(3) },
    { nomor: "QA/LK/2026/11/0001", status: "selesai", format: "pdf", url_berkas: "#", jenis: "kepatuhan", area: null, dari: hr(13), sampai: hr(7), dibuat_oleh: "Manajer Mutu", dibuat_pada: jam(26) },
  ];
  cursorLap = null;
  renderLaporan();
  const audit = [
    [0.02, "Supervisor QC", "laporan", "INSERT", "QA/LK/2026/11/0004"],
    [2, "sistem", "laporan", "UPDATE", "QA/LK/2026/11/0003", { status: "gagal" }],
    [3, "sistem", "laporan", "UPDATE", "QA/LK/2026/11/0002", { status: "selesai" }],
    [5, "Manajer Mutu", "batas", "UPDATE", "17"],
    [26, "sistem", "laporan", "UPDATE", "QA/LK/2026/11/0001", { status: "selesai" }],
  ].map(([h, aktor, tabel, aksi, rekaman, perubahan]) => ({ waktu: jam(h), aktor, tabel, aksi, rekaman, perubahan }));
  renderAudit(audit);
  const f = $("form");
  if (PRATINJAU) {
    // pratinjau: formulir tampil terisi seperti aslinya, tetapi kiriman tidak pura-pura berhasil
    f.dari.value = hr(6);
    f.sampai.value = hr(0);
    $("f-area").insertAdjacentHTML("beforeend", contoh().area.map((a) => `<option>${esc(a.nama)}</option>`).join(""));
    f.addEventListener("submit", (e) => { e.preventDefault(); tampilGalat("Ini pratinjau, jadi laporan tidak diterbitkan. Jalankan API untuk menerbitkan laporan."); });
    return;
  }
  f.querySelectorAll("input, select, button").forEach((el) => { el.disabled = true; });
  tampilGalat("Formulir nonaktif karena API tidak tersambung. Jalankan API untuk menerbitkan laporan.");
}

async function init() {
  $("cetak").addEventListener("click", () => window.print());
  $("lebih").addEventListener("click", async () => {
    const h = await api(`/laporan?limit=5&cursor=${encodeURIComponent(cursorLap)}`);
    laporan.push(...h.data);
    cursorLap = h.cursor_berikut;
    renderLaporan();
  });
  if (TANPA_API) return modeContoh("halaman dibuka tanpa API");
  try {
    const [areas, k, lap] = await Promise.all([api("/area"), api("/kepatuhan?hari=7"), api("/laporan?limit=5")]);
    siapkanForm(areas);
    renderKepatuhan(k);
    laporan = lap.data;
    cursorLap = lap.cursor_berikut;
    renderLaporan();
    await muatAudit();
    $("conn").textContent = `Tersambung, diperbarui pukul ${hhmm(new Date())}`;
    pantau();
    setInterval(async () => {
      try { renderKepatuhan(await api("/kepatuhan?hari=7")); $("conn").textContent = `Tersambung, diperbarui pukul ${hhmm(new Date())}`; }
      catch (e) { $("conn").textContent = `Data belum diperbarui (${e.message}). Dicoba lagi dalam 30 detik.`; }
    }, 30000);
  } catch (e) {
    modeContoh(`API tidak menjawab (${e.message})`);
  }
}
init();
