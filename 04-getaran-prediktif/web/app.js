// Dasbor getaran: kueri GraphQL POST /graphql. Daftar mesin di sidebar, detail mesin terpilih di kanan.
// Tanpa API (file:// atau stack mati) = data contoh bawaan dan formulir perintah kerja dinonaktifkan.
const GQL = "/graphql";
const POLL_MS = 60000;
const $ = (id) => document.getElementById(id);
let pilihan = decodeURIComponent(location.hash.slice(1)) || null;
let modeContoh = false;
let detail = null;

const Q_DAFTAR = `{ ringkasan { jumlahMesin perluTindakan offline }
  daftarMesin { id nama area zona status rmsTerkiniMmS } }`;
const Q_DETAIL = `query Detail($id: ID!) { mesin(id: $id) {
  id nama area kelasIso dayaKw rpm bantalan jamOperasi rmsTerkiniMmS suhuBantalanC diukurPada zona status perubahan30HariMmS
  batasZona { ab bc cd }
  tren(hari: 30) { tanggal rmsMmS suhuMaksC }
  spektrum { diukurPada resolusiHz frekuensiPutarHz bpfoHz amplitudoMmS }
  perintahKerja { id judul prioritas status dibuatPada } } }`;
const M_PK = `mutation Buat($input: PerintahKerjaInput!) { buatPerintahKerja(input: $input) { id judul prioritas status dibuatPada } }`;

async function gql(query, variables = {}) {
  const r = await fetch(GQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error(`Server menjawab ${r.status}.`);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

// ---------- data contoh (bentuk sama dengan jawaban GraphQL) ----------
const CONTOH_MESIN = [
  ["K-02", "Kompresor udara K-02", "Kompresor & utilitas", "C", "PERINGATAN", 5.3, "II", 55, 1488, "6309 (contoh)", 3.58, 18420, 71, 3.1, 2.2],
  ["P-01", "Pompa air pendingin P-01", "Kompresor & utilitas", "B", "NORMAL", 2.4, "II", 30, 2950, "6308 (contoh)", 3.07, 22100, 48, 2.1, 0.3],
  ["K-01", "Kompresor udara K-01", "Kompresor & utilitas", "B", "NORMAL", 1.9, "II", 55, 1488, "6309 (contoh)", 3.58, 21870, 55, 1.8, 0.1],
  ["BL-L2", "Blower oven Line 2", "SMT Line 2", "B", "NORMAL", 1.6, "I", 7.5, 2880, "6205 (contoh)", 3.05, 9650, 62, 1.6, 0],
  ["BL-L1", "Blower oven Line 1", "SMT Line 1", "B", "NORMAL", 1.4, "I", 7.5, 2880, "6205 (contoh)", 3.05, 9880, 60, 1.5, 0],
  ["AHU-1", "AHU produksi 1", "HVAC produksi", "A", "NORMAL", 1.0, "II", 18.5, 1460, "6310 (contoh)", 3.06, 30210, 39, 1.0, 0],
  ["CV-TV", "Konveyor perakitan TV", "Perakitan TV", null, "OFFLINE", null, "I", 5.5, 1420, "6206 (contoh)", 3.05, 12004, null, 0.9, 0],
];
const BATAS = { I: { ab: 0.71, bc: 1.8, cd: 4.5 }, II: { ab: 1.12, bc: 2.8, cd: 7.1 } };

function contohDaftar() {
  return {
    ringkasan: { jumlahMesin: 7, perluTindakan: 1, offline: 1 },
    daftarMesin: CONTOH_MESIN.map(([id, nama, area, zona, status, rms]) => ({ id, nama, area, zona, status, rmsTerkiniMmS: rms })),
  };
}

function contohDetail(id) {
  const m = CONTOH_MESIN.find((x) => x[0] === id) || CONTOH_MESIN[0];
  const [mid, nama, area, zona, status, rms, kelas, daya, rpm, bantalan, fb, jam, suhu, dasar, deg] = m;
  const r = rng(mid.length * 7);
  const tren = Array.from({ length: 30 }, (_, i) => {
    const t = new Date(NOW - (29 - i) * 86400000);
    return { tanggal: t.toISOString().slice(0, 10), rmsMmS: +(dasar + deg * Math.pow(i / 29, 2.2) + (r() - 0.5) * 0.1).toFixed(2), suhuMaksC: suhu };
  });
  const f1 = rpm / 60, bpfo = f1 * fb;
  const a = Array.from({ length: 200 }, () => 0.03 + r() * 0.06);
  [[f1, 0.45 * dasar], [2 * f1, 0.18 * dasar], [bpfo, 0.08 + 0.9 * deg], [2 * bpfo, 0.04 + 0.45 * deg], [3 * bpfo, 0.02 + 0.2 * deg]]
    .forEach(([f, amp]) => { const i = Math.round(f / 2); if (i > 0 && i < 199) { a[i] += amp; a[i - 1] += amp / 4; a[i + 1] += amp / 4; } });
  return {
    id: mid, nama, area, kelasIso: kelas, dayaKw: daya, rpm, bantalan, jamOperasi: jam, rmsTerkiniMmS: rms, suhuBantalanC: suhu,
    diukurPada: new Date(NOW - (status === "OFFLINE" ? 7200000 : 300000)).toISOString(), zona, status,
    perubahan30HariMmS: status === "OFFLINE" ? null : +(tren[29].rmsMmS - tren[0].rmsMmS).toFixed(2), batasZona: BATAS[kelas],
    tren: status === "OFFLINE" ? tren.slice(0, 29) : tren,
    spektrum: status === "OFFLINE" ? null : { diukurPada: new Date(NOW - 1920000).toISOString(), resolusiHz: 2, frekuensiPutarHz: +f1.toFixed(2), bpfoHz: +bpfo.toFixed(1), amplitudoMmS: a },
    perintahKerja: mid === "P-01" ? [{ id: "PK-0001", judul: "Pelumasan ulang bearing sisi penggerak", prioritas: "SEDANG", status: "SELESAI", dibuatPada: new Date(NOW - 12 * 86400000).toISOString() }] : [],
  };
}

// ---------- tampilan ----------
const STATUS_ST = { NORMAL: ["ok", "Normal"], PERINGATAN: ["warn", "Peringatan"], KRITIS: ["crit", "Kritis"], OFFLINE: ["off", "Terputus"] };
const SAT = (u) => `&thinsp;<small>${u}</small>`;
const stempel = (z) => `<span class="stempel z-${z || "x"}" aria-label="${z ? "Zona " + z : "Tanpa data"}">${z || "-"}</span>`;
const tgl = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

function renderDaftar(d) {
  const r = d.ringkasan;
  $("ringkas").textContent = `${r.jumlahMesin} mesin, ${r.perluTindakan} perlu tindakan, ${r.offline} terputus`;
  if (!pilihan || !d.daftarMesin.some((m) => m.id === pilihan)) pilihan = d.daftarMesin[0].id;
  $("daftar").innerHTML = d.daftarMesin.map((m) => `<li><a href="#${encodeURIComponent(m.id)}" data-id="${m.id}"${m.id === pilihan ? ' aria-current="true"' : ""}>
      ${stempel(m.status === "OFFLINE" ? null : m.zona)}<span class="nm">${m.nama}<span class="ar">${m.area}</span></span>
      ${m.status === "OFFLINE" ? `<span class="rms putus">terputus</span>` : `<span class="rms">${fmt(m.rmsTerkiniMmS, 1)}</span>`}</a></li>`).join("");
  $("daftar").setAttribute("aria-busy", "false");
}

function temuan(m) {
  if (m.status === "OFFLINE") return `<b>Sensor terputus sejak pukul ${hhmm(new Date(m.diukurPada))}.</b> Periksa kabel sensor dan gateway, lalu nilai kondisi mesin setelah data masuk lagi.`;
  const t = m.tren, s = m.spektrum;
  const awal = t.length ? t[0].rmsMmS : null;
  let sebab = "";
  if (s) {
    const iMax = s.amplitudoMmS.indexOf(Math.max(...s.amplitudoMmS));
    const f = iMax * s.resolusiHz, dekat = (x) => Math.abs(f - x) <= s.resolusiHz * 1.5;
    if ([1, 2, 3].some((k) => dekat(k * s.bpfoHz))) sebab = ` Puncak tertinggi spektrum ada di frekuensi cacat lintasan luar bearing (BPFO ${fmt(s.bpfoHz, 1)}&nbsp;Hz).`;
    else if (dekat(s.frekuensiPutarHz)) sebab = ` Puncak tertinggi spektrum ada di 1× putaran (${fmt(s.frekuensiPutarHz, 1)}&nbsp;Hz), tanda rotor tidak seimbang.`;
  }
  if (m.status === "NORMAL") {
    const u = m.perubahan30HariMmS ?? 0;
    const arah = Math.abs(u) < 0.05 ? "tidak berubah" : `${u > 0 ? "naik" : "turun"} ${fmt(Math.abs(u), 1)}&nbsp;mm/s`;
    return `<b>Getaran stabil di zona ${m.zona}, belum perlu tindakan.</b> Dalam 30 hari getaran ${arah}.`;
  }
  return `<b>Getaran naik dari ${fmt(awal, 1)} menjadi ${fmt(m.rmsTerkiniMmS, 1)}&nbsp;mm/s dalam 30 hari.</b>${sebab} Jadwalkan pemeriksaan sebelum getaran masuk zona D (${fmt(m.batasZona.cd, 1)}&nbsp;mm/s).`;
}

function renderDetail(m) {
  detail = m;
  $("jejak").innerHTML = `${m.area} / <span class="kode">${m.id}</span>`;
  $("nama").textContent = m.nama;
  const zAktif = m.status === "OFFLINE" ? null : m.zona;
  $("stempel").outerHTML = `<span class="stempel besar z-${zAktif || "x"}" id="stempel" aria-hidden="true"><i>zona</i><b>${zAktif || "-"}</b><i>ISO 10816-1</i></span>`;
  $("kop-mesin").innerHTML = `<span class="kode">${m.id}</span>, ${fmt(m.rpm, 0)}&nbsp;rpm`;
  $("temuan").innerHTML = temuan(m);
  const [k, label] = STATUS_ST[m.status];
  $("k-rms").innerHTML = m.rmsTerkiniMmS == null ? "-" : `${fmt(m.rmsTerkiniMmS, 1)}${SAT("mm/s")}`;
  $("k-rms-d").innerHTML = `${st(k, label)} <span>diukur pukul ${hhmm(new Date(m.diukurPada))}</span>`;
  $("k-zona").innerHTML = !m.zona ? "-" : zAktif ? `${stempel(m.zona)}<span class="zt">kelas ${m.kelasIso}</span>` : `<span class="zt">terakhir zona ${m.zona}, kelas ${m.kelasIso}</span>`;
  $("k-zona").classList.add("zona");
  $("k-zona-d").innerHTML = `C mulai ${fmt(m.batasZona.bc, 1)}, D mulai ${fmt(m.batasZona.cd, 1)}&nbsp;mm/s`;
  const u = m.perubahan30HariMmS;
  $("k-ubah").innerHTML = u == null ? "-" : `${u > 0 ? "+" : u < 0 ? "\u2212" : ""}${fmt(Math.abs(u), 1)}${SAT("mm/s")}`;
  $("k-ubah").classList.toggle("naik", u != null && u >= 0.5);
  $("k-suhu").innerHTML = m.suhuBantalanC == null ? "-" : `${fmt(m.suhuBantalanC, 0)}${SAT("°C")}`;
  $("k-suhu-d").textContent = `bearing ${m.bantalan}`;
  $("k-jam").innerHTML = `${fmt(m.jamOperasi, 0)}${SAT("jam")}`;

  spektrum($("spektrum"), m.spektrum);
  const t = m.tren;
  if (t.length > 1) {
    lineChart($("tren"), {
      x: t.map((p) => new Date(p.tanggal + "T12:00:00+07:00")), h: 220, unit: "mm/s", dec: 1, min: 0,
      max: Math.ceil(Math.max(m.batasZona.cd * 1.1, ...t.map((p) => p.rmsMmS))),
      fmtX: (d) => `${d.getDate()}/${d.getMonth() + 1}`,
      series: [{ name: "RMS", color: "var(--s1)", data: t.map((p) => p.rmsMmS) }],
      bands: [{ y: m.batasZona.cd, label: `zona D mulai ${fmt(m.batasZona.cd, 1)}`, color: "var(--crit)" },
              { y: m.batasZona.bc, label: `zona C mulai ${fmt(m.batasZona.bc, 1)}`, color: "var(--warn)" }],
    });
  } else $("tren").innerHTML = `<p class="kosong">Belum ada riwayat pengukuran untuk mesin ini.</p>`;

  $("pk-d").textContent = m.perintahKerja.length ? `${m.perintahKerja.length} tercatat` : "";
  $("pk-list").innerHTML = m.perintahKerja.length ? m.perintahKerja.map((p) => `<li>
      <span class="pk-id">${p.id}</span><span class="pk-j">${p.judul}</span>
      <span class="pk-m">Prioritas ${p.prioritas.toLowerCase()}, ${p.status.toLowerCase()}, dibuat ${tgl(p.dibuatPada)}</span></li>`).join("")
    : `<li class="kosong">Belum ada perintah kerja untuk mesin ini. Buat dari tombol di atas bila temuan perlu ditindaklanjuti.</li>`;
  $("identitas").innerHTML = `<dt>Putaran</dt><dd>${fmt(m.rpm, 0)}&nbsp;rpm (${fmt(m.rpm / 60, 1)}&nbsp;Hz)</dd>
    <dt>Daya motor</dt><dd>${fmt(m.dayaKw, 1, false)}&nbsp;kW, kelas ISO ${m.kelasIso}</dd><dt>Bearing</dt><dd>${m.bantalan}</dd>`;
  $("pk-judul").value = `Periksa bearing ${m.nama}`;
  $("isi").setAttribute("aria-busy", "false");
}

// Spektrum: batang tipis netral, garis cacat diberi aksen + penanda 1×, 2×, BPFO dan harmoniknya
function spektrum(el, s) {
  if (!s) { el.innerHTML = `<p class="kosong">Belum ada spektrum karena sensor terputus. Spektrum muncul lagi setelah pengukuran berikutnya.</p>`; $("spek-legend").innerHTML = ""; return; }
  $("spek-d").innerHTML = `mm/s RMS, resolusi ${fmt(s.resolusiHz, 0)}&nbsp;Hz, diukur pukul ${hhmm(new Date(s.diukurPada))}`;
  const W = el.clientWidth || 900, H = W < 600 ? 220 : 256, L = 48, R = 16, T = 34, B = 26;
  const a = s.amplitudoMmS, n = a.length, fMax = n * s.resolusiHz;
  const hi = Math.ceil(Math.max(...a) * 1.15 * 2) / 2;
  const sx = (f) => L + (f / fMax) * (W - L - R), sy = (v) => T + (1 - v / hi) * (H - T - B);
  const penanda = [[s.frekuensiPutarHz, "1×"], [2 * s.frekuensiPutarHz, "2×"], [s.bpfoHz, "BPFO"], [2 * s.bpfoHz, "2×BPFO"], [3 * s.bpfoHz, "3×BPFO"]].filter(([f]) => f < fMax);
  const cacat = (f) => [1, 2, 3].some((k) => Math.abs(f - k * s.bpfoHz) <= s.resolusiHz * 1.5);
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (hi * k) / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${fmt(v, 1, false)}</text>`;
  }
  for (let f = 0; f <= fMax; f += W < 600 ? 100 : 50) g += `<text x="${sx(f)}" y="${H - 6}" text-anchor="middle">${f} Hz</text>`;
  const bw = Math.max(1, (W - L - R) / n - 1);
  a.forEach((v, i) => {
    const f = i * s.resolusiHz;
    g += `<rect x="${sx(f) - bw / 2}" y="${sy(v)}" width="${bw}" height="${H - B - sy(v)}" rx="1" fill="${cacat(f) ? "var(--s1)" : "var(--s3)"}"/>`;
  });
  penanda.forEach(([f, lbl], k) => {
    g += `<line x1="${sx(f)}" x2="${sx(f)}" y1="${T - 4}" y2="${H - B}" stroke="${lbl.includes("BPFO") ? "var(--s1)" : "var(--ink-3)"}" stroke-dasharray="2 3" opacity=".8"/>
          <text x="${sx(f)}" y="${T - 10 - (W < 600 ? (k % 2) * 13 : 0)}" text-anchor="middle" style="fill:${lbl.includes("BPFO") ? "var(--accent-ink)" : "var(--ink-2)"}">${lbl}</text>`;
  });
  el.classList.add("chart");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${el.dataset.label}">${g}</svg><div class="tip"></div>`;
  $("spek-legend").innerHTML = `<span><i class="sw akt"></i>Frekuensi cacat bearing (BPFO dan harmoniknya)</span><span><i class="sw"></i>Frekuensi lain</span>`;
  const svg = el.querySelector("svg"), tip = el.querySelector(".tip");
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const i = Math.round(((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * fMax / s.resolusiHz);
    if (i < 0 || i >= n) return (tip.style.opacity = 0);
    tip.innerHTML = `${fmt(i * s.resolusiHz, 0)}&nbsp;Hz<br>${fmt(a[i], 2)}&nbsp;mm/s`;
    tip.style.left = (sx(i * s.resolusiHz) / W) * r.width + "px";
    tip.style.top = (sy(a[i]) / H) * r.height + "px";
    tip.style.opacity = 1;
  });
  svg.addEventListener("mouseleave", () => (tip.style.opacity = 0));
}

// ---------- koneksi ----------
function koneksi(teks, kelas) { const k = $("koneksi"); k.textContent = teks; k.className = "koneksi " + kelas; }

function keModeContoh(sebab) {
  modeContoh = true;
  const b = $("banner");
  b.hidden = false;
  b.innerHTML = `<b>Mode data contoh: API tidak terhubung.</b> ${sebab} Jalankan <code>docker compose -p konsep-04 up -d</code> lalu buka <code>http://localhost:18040</code>.`;
  // Pratinjau: API memang tidak dijalankan, jadi status netral, bukan galat.
  if (PRATINJAU) koneksi("Pratinjau tanpa API", "");
  else koneksi("Tidak terhubung", "putus");
  renderDaftar(contohDaftar());
  renderDetail(contohDetail(pilihan));
}

async function muat() {
  if (TANPA_API) return keModeContoh("Halaman dibuka langsung dari berkas.");
  if (modeContoh) return;
  try {
    renderDaftar(await gql(Q_DAFTAR));
    renderDetail((await gql(Q_DETAIL, { id: pilihan })).mesin);
    $("banner").hidden = true;
    koneksi(`Terhubung, diperbarui pukul ${hhmm(new Date())}`, "ok");
  } catch (e) {
    const sebab = e instanceof TypeError ? "Server API tidak bisa dihubungi." : e.message;
    if (detail) return koneksi(`Gagal memperbarui pukul ${hhmm(new Date())}. Layar menampilkan data terakhir.`, "putus");
    keModeContoh(sebab);
  }
}

addEventListener("hashchange", () => {
  pilihan = decodeURIComponent(location.hash.slice(1));
  document.querySelectorAll("#daftar a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.id === pilihan));
  if (modeContoh) return renderDetail(contohDetail(pilihan));
  gql(Q_DETAIL, { id: pilihan }).then((d) => renderDetail(d.mesin)).catch((e) => koneksi(`Data ${pilihan} gagal dimuat. ${e.message}`, "putus"));
});

$("tombol-pk").addEventListener("click", () => {
  const f = $("form-pk");
  f.hidden = !f.hidden;
  $("pk-pesan").textContent = modeContoh ? "Perintah kerja tidak bisa disimpan di mode data contoh. Jalankan API untuk menyimpan." : "";
  f.querySelector("[type=submit]").disabled = modeContoh;
  if (!f.hidden) $("pk-judul").focus();
});
$("pk-batal").addEventListener("click", () => ($("form-pk").hidden = true));
$("form-pk").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (modeContoh) return;
  const pesan = $("pk-pesan");
  pesan.textContent = "Menyimpan perintah kerja…";
  try {
    const d = await gql(M_PK, { input: { mesinId: pilihan, judul: $("pk-judul").value, prioritas: $("pk-prioritas").value } });
    pesan.textContent = `Perintah kerja tersimpan sebagai ${d.buatPerintahKerja.id}.`;
    $("form-pk").hidden = true;
    renderDetail((await gql(Q_DETAIL, { id: pilihan })).mesin);
  } catch (err) {
    pesan.textContent = `Perintah kerja belum tersimpan. ${err.message} Periksa isian, lalu simpan lagi.`;
  }
});

if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";
muat();
setInterval(muat, POLL_MS);
addEventListener("resize", () => detail && renderDetail(detail));
