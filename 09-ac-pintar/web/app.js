// Dasbor Armada AC Pintar: menarik data dari PostgREST lewat /api (proxy nginx satu origin).
// Bila API tidak terjangkau (mis. dibuka via file://), memakai data contoh bawaan dan menampilkan pita peringatan.

const API = "/api";
const SEGAR_MS = 30000;
const ST = { kritis: "crit", perlu_servis: "warn", offline: "off", normal: "ok" };
const ST_TEKS = { kritis: "Kritis", perlu_servis: "Perlu servis", offline: "Offline", normal: "Normal" };
const URUT = { kritis: 0, perlu_servis: 1, offline: 2, normal: 3 };
const $ = (id) => document.getElementById(id);
const tgl = (s) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const jam = (s) => hhmm(new Date(s));

let data = null, pilih = null, filter = "semua", mode = "api";

async function ambil(path) {
  const r = await fetch(API + path, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} pada ${path}`);
  return r.json();
}

async function muat() {
  try {
    if (TANPA_API) throw new Error("dibuka sebagai file lokal");
    const [ringkas, unit, kota, galat] = await Promise.all([
      ambil("/rpc/ringkasan_armada"),
      ambil("/unit_status?status=neq.normal&order=status,unit_id"),
      ambil("/per_kota?order=bermasalah.desc,kota"),
      ambil("/galat_24jam?order=jumlah_unit.desc"),
    ]);
    const tiket = await ambil("/tiket?status=neq.selesai&order=dibuat.desc");
    data = { ringkas, unit, kota, galat, tiket };
    mode = "api";
    $("banner").hidden = true;
    document.querySelector("[data-pratinjau]").hidden = true;
    $("sumber").className = "sumber live";
    $("sumber").textContent = `Terhubung ke API · diperbarui pukul ${jam(ringkas.diperbarui)}`;
  } catch (e) {
    data = contoh();
    mode = "contoh";
    $("banner").hidden = false;
    $("banner").textContent = `Mode data contoh: API tidak terhubung (${e.message}). Jalankan "docker compose up -d" di folder 09-ac-pintar lalu buka http://localhost:18090.`;
    const tanda = document.querySelector("[data-pratinjau]");
    tanda.hidden = false;
    tanda.textContent = PRATINJAU ? "Pratinjau, data contoh" : "Data contoh";
    // pratinjau: status sumber netral, bukan teks galat koneksi
    $("sumber").className = PRATINJAU ? "sumber live" : "sumber";
    $("sumber").textContent = PRATINJAU ? `Diperbarui pukul ${jam(data.ringkas.diperbarui)}` : "Data contoh bawaan";
  }
  gambar();
}

function gambar() {
  const { ringkas: r, unit, kota, galat } = data;
  const masalah = r.perlu_servis + r.kritis + r.offline;
  $("temuan").innerHTML = masalah
    ? `<b>Ada ${masalah} unit bermasalah, ${r.bermasalah_tanpa_tiket} di antaranya belum punya tiket servis.</b> Hubungi pelanggan sebelum mereka melapor sendiri.`
    : "<b>Semua unit terhubung bekerja normal.</b> Tidak ada tindakan yang diperlukan sekarang.";
  $("btnTanpaTiket").hidden = !r.bermasalah_tanpa_tiket;
  $("btnTanpaTiket").textContent = `Tampilkan ${r.bermasalah_tanpa_tiket} unit tanpa tiket`;

  $("kpis").innerHTML = [
    ["Belum punya tiket", r.bermasalah_tanpa_tiket, "", "big", "unit bermasalah"],
    ["Unit terhubung", r.terhubung, `/ ${fmt(r.total, 0)}`, "", `${r.offline} offline lebih dari 15 menit`],
    ["Kritis", r.kritis, "", "", "melaporkan kode galat"],
    ["Perlu servis", r.perlu_servis, "", "", "kinerja turun, belum ada galat"],
    ["Tiket terbuka", r.tiket_baru + r.tiket_dijadwalkan, "", "", `${r.tiket_baru} baru, ${r.tiket_dijadwalkan} dijadwalkan`],
  ].map(([l, v, u, c, d]) => `<div class="kpi"><div class="l">${l}</div><div class="v ${c}">${fmt(v, 0)}<small>${u}</small></div><div class="d">${d}</div></div>`).join("");

  const max = Math.max(1, ...kota.map((k) => k.bermasalah));
  $("kota").innerHTML = kota.map((k) => `<div class="kota-row"><span>${k.kota}</span>
    <div class="track" role="img" aria-label="${k.bermasalah} dari ${k.total} unit bermasalah"><div class="fill" style="width:${(k.bermasalah / max) * 100}%"></div></div>
    <span class="v">${k.bermasalah} / ${k.total}</span></div>`).join("");

  $("galat").innerHTML = galat.length
    ? galat.map((g) => `<tr><td class="mono">${g.kode}</td><td>${g.arti}</td><td class="n">${g.jumlah_unit}</td></tr>`).join("")
    : `<tr><td colspan="3" class="muted">Tidak ada kode galat dalam 24 jam terakhir.</td></tr>`;

  daftar();
  const tetap = unit.find((u) => u.unit_id === pilih?.unit_id);
  // default: unit yang ruangannya paling jauh dari suhu set (grafiknya paling informatif)
  const selisih = (u) => (u.suhu_ruang == null || u.suhu_set == null ? -99 : u.suhu_ruang - u.suhu_set);
  detail(tetap || unit.slice().sort((a, b) => selisih(b) - selisih(a))[0]);
}

function daftar() {
  const rows = data.unit
    .filter((u) => filter === "semua" || !u.tiket_id)
    .sort((a, b) => URUT[a.status] - URUT[b.status] || a.unit_id.localeCompare(b.unit_id));
  $("daftar").innerHTML = rows.length
    ? rows.map((u) => `<li><button class="unit-btn" type="button" data-id="${u.unit_id}" ${u.unit_id === pilih?.unit_id ? 'aria-current="true"' : ""}>
        <span class="id">${u.unit_id}</span>${st(ST[u.status], ST_TEKS[u.status])}
        <span class="why">${u.alasan}</span>
        <span class="meta"><span>${u.kota}</span><span>${u.model}</span>${u.tiket_id ? `<span class="tk">Tiket #${u.tiket_id}</span>` : ""}</span>
      </button></li>`).join("")
    : `<li class="empty">${filter === "tanpa" ? "Semua unit bermasalah sudah punya tiket." : "Tidak ada unit bermasalah."}</li>`;
}

async function detail(u) {
  if (!u) return;
  pilih = u;
  document.querySelectorAll(".unit-btn").forEach((b) =>
    b.dataset.id === u.unit_id ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
  const k = ST[u.status];
  $("judulUnit").textContent = u.unit_id;
  $("unitStatus").innerHTML = st(k, ST_TEKS[u.status]);
  $("unitAlasan").textContent = u.alasan;
  $("ac").dataset.st = k;
  $("acSuhu").textContent = u.status === "offline" ? "--" : u.suhu_ruang == null ? "E1" : `${fmt(+u.suhu_ruang, 0)}°`;
  $("acFlow").dataset.mati = u.menyala && u.status !== "offline" ? "0" : "1";
  $("acFlow").dataset.lemah = u.status === "perlu_servis" || u.kode_galat === "P2" ? "1" : "0";
  $("unitDl").innerHTML = [
    ["Kota", u.kota], ["Model", `${u.model} · ${u.refrigeran}`], ["Pelanggan", `<span class="mono">${u.pelanggan_ref}</span> (disamarkan)`],
    ["Dipasang", new Date(u.dipasang).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ["Bacaan terakhir", u.terakhir ? `pukul ${jam(u.terakhir)}` : "belum ada"],
    ["Suhu set / ruang", `${u.suhu_set == null ? "-" : fmt(+u.suhu_set) + " °C"} / ${u.suhu_ruang == null ? "-" : fmt(+u.suhu_ruang) + " °C"}`],
    ["Arus kompresor", u.arus_kompresor == null ? "-" : `${fmt(+u.arus_kompresor)} A`],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
  tiket(u);

  let t;
  try {
    if (mode !== "api") throw 0;
    const sejak = new Date(Date.now() - 24 * 3600e3).toISOString();
    t = await ambil(`/telemetri?unit_id=eq.${encodeURIComponent(u.unit_id)}&waktu=gte.${sejak}&order=waktu.asc&select=waktu,suhu_set,suhu_ruang,arus_kompresor,tekanan_hisap`);
  } catch { t = contohTelemetri(u); }
  if (pilih !== u) return;
  if (!t.length) { $("grafikSuhu").innerHTML = `<p class="empty">Belum ada telemetri 24 jam terakhir untuk unit ini.</p>`; return; }
  $("catatanSuhu").textContent = t.every((r) => r.suhu_ruang == null) ? "Sensor suhu ruang galat: tidak ada bacaan suhu ruang, hanya suhu set yang tampil." : "";
  const x = t.map((r) => new Date(r.waktu)), n = (k) => t.map((r) => (r[k] == null ? null : +r[k]));
  lineChart($("grafikSuhu"), { x, h: 300, unit: "°C", min: 18, max: 36, dec: 1,
    series: [{ name: "Ruang", color: "var(--s1)", data: n("suhu_ruang") }, { name: "Set", color: "var(--s2)", data: n("suhu_set") }] });
  const pk = +u.kapasitas_pk * 3.9;
  lineChart($("grafikArus"), { x, h: 170, unit: "A", min: 0, max: Math.ceil((pk * 1.8) / 2) * 2, dec: 0, ticks: 2,
    series: [{ name: "Arus", color: "var(--s3)", data: n("arus_kompresor") }], bands: [{ y: +(pk * 1.25).toFixed(1), label: "batas 125 %", color: "var(--warn)" }] });
  lineChart($("grafikTekanan"), { x, h: 170, unit: "psi", min: 60, max: 180, dec: 0, ticks: 3,
    series: [{ name: "Tekanan", color: "var(--s3)", data: n("tekanan_hisap") }], bands: [{ y: 115, label: "rendah 115", color: "var(--warn)" }] });
}

function tiket(u) {
  const t = data.tiket.find((x) => x.unit_id === u.unit_id);
  const el = $("tiket");
  if (t) {
    el.className = "tiket";
    el.innerHTML = `<div class="no">Tiket #${t.id}</div><div class="ttl">${t.masalah}</div><hr>
      <dl class="dl"><dt>Status</dt><dd>${t.status === "baru" ? "Baru, belum dijadwalkan" : "Dijadwalkan"}</dd>
      <dt>Jadwal</dt><dd>${t.jadwal ? `${tgl(t.jadwal)}, pukul ${jam(t.jadwal)}` : "-"}</dd>
      <dt>Teknisi</dt><dd>${t.peran_teknisi || "Belum ditugaskan"}</dd>
      <dt>Dibuat</dt><dd>${tgl(t.dibuat)}, pukul ${jam(t.dibuat)}</dd></dl>`;
  } else if (u.status !== "normal") {
    el.className = "tiket kosong";
    el.innerHTML = `<div class="no">Belum ada tiket</div><div class="ttl">Siapkan tiket servis untuk unit ini</div><hr>
      <p class="small">Ringkasan masalah disalin ke papan klip untuk ditempel di sistem tiket.</p>
      <button class="btn primary" type="button" id="salin">Salin ringkasan masalah</button><p class="small muted" id="salinInfo" role="status"></p>`;
    $("salin").onclick = async () => {
      const teks = `${u.unit_id} (${u.kota}, ${u.model}) · ${ST_TEKS[u.status]}: ${u.alasan}. Pelanggan ${u.pelanggan_ref}.`;
      try { await navigator.clipboard.writeText(teks); $("salinInfo").textContent = "Ringkasan tersalin."; }
      catch { $("salinInfo").textContent = "Peramban menolak akses papan klip. Salin manual: " + teks; }
    };
  } else { el.className = "tiket"; el.innerHTML = `<div class="no">Tidak perlu tiket</div><div class="ttl">Unit bekerja normal</div>`; }
}

// ---------- interaksi ----------
$("daftar").addEventListener("click", (e) => {
  const b = e.target.closest(".unit-btn");
  if (b) detail(data.unit.find((u) => u.unit_id === b.dataset.id));
});
document.querySelector(".seg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  daftar();
});
$("btnTanpaTiket").onclick = () => document.querySelector('.seg [data-f="tanpa"]').click();

// ---------- data contoh (dipakai bila API mati) ----------
function contoh() {
  const iso = (m) => new Date(NOW - m * 60000).toISOString();
  const unit = [
    ["AC-BDG-0212", "Bandung", "kritis", "Sensor suhu ruang terbuka atau korsleting", "E1", 15, null, 25, 4.1, 133],
    ["AC-SBY-0164", "Surabaya", "kritis", "Arus kompresor melebihi batas", "E5", null, 26.9, 25, 8.3, 148],
    ["AC-MKS-0222", "Makassar", "kritis", "Tekanan hisap rendah", "P2", 14, 28.4, 24, 5.6, 93],
    ["AC-SMG-0185", "Semarang", "perlu_servis", "Tekanan hisap rendah, kemungkinan refrigeran berkurang", null, null, 27.3, 24, 5.9, 108],
    ["AC-MDN-0123", "Medan", "offline", "Tidak mengirim data sejak pukul 12.57", null, null, null, null, null, null],
  ].map(([id, kota, status, alasan, kg, tk, ruang, set, arus, tek]) => ({ unit_id: id, kota, status, alasan, kode_galat: kg, tiket_id: tk,
    model: "Split dinding 1,5 PK", kapasitas_pk: 1.5, refrigeran: "R32", pelanggan_ref: "PLG-" + id.slice(-4), dipasang: "2024-06-01",
    terakhir: iso(status === "offline" ? 95 : 1), menyala: status !== "offline", suhu_set: set, suhu_ruang: ruang, arus_kompresor: arus, tekanan_hisap: tek }));
  return {
    ringkas: { total: 240, terhubung: 237, normal: 235, perlu_servis: 1, kritis: 3, offline: 1, tiket_baru: 1, tiket_dijadwalkan: 1, bermasalah_tanpa_tiket: 3, diperbarui: iso(0) },
    unit,
    kota: [["Bandung", 2], ["Surabaya", 1], ["Makassar", 1], ["Semarang", 1], ["Medan", 1], ["Jakarta", 0]].map(([kota, b]) => ({ kota, total: 40, bermasalah: b })),
    galat: [{ kode: "E1", arti: "Sensor suhu ruang terbuka atau korsleting", jumlah_unit: 1 }, { kode: "E5", arti: "Arus kompresor melebihi batas", jumlah_unit: 1 }, { kode: "P2", arti: "Tekanan hisap rendah", jumlah_unit: 1 }],
    tiket: [
      { id: 15, unit_id: "AC-BDG-0212", status: "baru", masalah: "Kode galat E1 dari unit", dibuat: iso(50), jadwal: null, peran_teknisi: null },
      { id: 14, unit_id: "AC-MKS-0222", status: "dijadwalkan", masalah: "Pendinginan lemah, tekanan hisap turun", dibuat: iso(300), jadwal: new Date(2026, 10, 6, 9).toISOString(), peran_teknisi: "Teknisi mitra area" },
    ],
  };
}
function contohTelemetri(u) {
  const x = times(96, 15), seed = u.unit_id.length + u.unit_id.charCodeAt(7);
  const ruang = gen(96, { base: (u.suhu_set ?? 25) + 1.2, amp: 0.8, noise: 0.5, seed });
  return x.map((w, i) => ({ waktu: w.toISOString(), suhu_set: u.suhu_set ?? 25,
    suhu_ruang: u.kode_galat === "E1" ? null : ruang[i] + (u.status === "perlu_servis" || u.kode_galat === "P2" ? (i / 95) * 2.5 : 0),
    arus_kompresor: (u.arus_kompresor ?? 5) * (0.92 + 0.08 * Math.sin(i / 7)), tekanan_hisap: (u.tekanan_hisap ?? 132) + (95 - i) * (u.kode_galat === "P2" ? 0.4 : 0) }));
}

muat();
setInterval(() => mode === "api" && muat(), SEGAR_MS);
