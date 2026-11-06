// Dasbor Ruang Bersih & ESD: snapshot REST + Server-Sent Events, fallback ke data contoh.
const LANGSUNG = !TANPA_API;
const NAMA_METRIK = {
  suhu: ["Suhu", "°C", 1], rh: ["Kelembapan", "%RH", 1], p05: ["Partikel ≥ 0,5 µm", "per m³", 0],
  dp: ["Beda tekanan", "Pa", 1], offset: ["Tegangan offset", "V", 1], luruh: ["Waktu luruh", "s", 1],
};
const NAMA_JENIS = { suhu_rh: "Suhu & kelembapan", partikel: "Penghitung partikel", tekanan: "Beda tekanan", ionizer: "Ionizer", esd: "Stasiun uji gelang ESD" };
const KODE = { suhu_rh: "TH", partikel: "PC", tekanan: "DP", ionizer: "IO", esd: "ES" };
// satu istilah per status di seluruh situs: legenda, denah, detail, tabel
const STATUS = { ok: "Memenuhi syarat", warn: "Perlu perhatian", crit: "Di luar syarat", off: "Tidak terhubung" };
const $ = (id) => document.getElementById(id);
const tsLabel = (t) => { const d = new Date(t); return `${hhmm(d)}.${pad(d.getSeconds())}`; };
// angka dengan tanda minus tipografis
const angka = (v, d, tetap) => fmt(v, d, tetap).replace("-", "−");
// satuan dipisah spasi tak putus; persen menempel (EYD)
const dgnSatuan = (teks, u) => (u === "%" ? `${teks}%` : `${teks} ${u}`);

let snap = null;
let contohAktif = false;
let pilih = "ION-TV-03";
const riwayatCache = {};

function koneksi(teks, kelas = "") { const el = $("koneksi"); el.textContent = teks; el.className = `koneksi ${kelas}`; }
function pita(teks) { const el = $("pita"); el.hidden = !teks; el.textContent = teks || ""; }

async function mulai() {
  $("legend").innerHTML = ["ok", "warn", "crit", "off"].map((k) => st(k, STATUS[k])).join("");
  if (!LANGSUNG) return modeContoh("Dasbor menampilkan data contoh karena dibuka langsung dari berkas. Untuk data langsung, jalankan docker compose lalu buka http://localhost:18050.");
  try {
    const r = await fetch("/api/snapshot");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    terima(await r.json());
    const es = new EventSource("/api/stream");
    es.addEventListener("snapshot", (e) => { pita(""); terima(JSON.parse(e.data)); });
    es.addEventListener("galat", (e) => pita(`Server melaporkan gangguan: ${JSON.parse(e.data).galat}. Dasbor tetap menampilkan data terakhir.`));
    es.onerror = () => koneksi("Koneksi terputus, menyambung ulang…", "putus");
  } catch (e) {
    modeContoh(`Server tidak menjawab (${e.message}), jadi dasbor menampilkan data contoh. Periksa layanan dengan docker compose -p konsep-05 ps.`);
  }
}

function modeContoh(pesan) {
  contohAktif = true;
  pita(pesan);
  // Pratinjau: API memang tidak dijalankan, jadi status netral, bukan galat.
  if (PRATINJAU) koneksi(`Data per pukul ${hhmm(new Date(window.CONTOH_SNAPSHOT.ts))}`);
  else koneksi("Tidak terhubung ke server", "putus");
  terima(window.CONTOH_SNAPSHOT, true);
}

function terima(data, contoh = false) {
  snap = data;
  if (!contoh) koneksi(`Terhubung, diperbarui pukul ${tsLabel(data.ts)}`, "hidup");
  if (!snap.titik.some((t) => t.id === pilih)) pilih = snap.titik[0].id;
  renderTemuan(); renderEsd(); renderDenah(); renderDetail(); renderRuang();
}

const byId = (id) => snap.titik.find((t) => t.id === id);
const fmtNilai = (m, v) => (v == null ? "tidak ada data" : dgnSatuan(angka(v, NAMA_METRIK[m][2]), NAMA_METRIK[m][1]));

function renderTemuan() {
  const masalah = snap.titik.filter((t) => t.status !== "ok");
  const el = $("temuan");
  if (!masalah.length) { el.innerHTML = "<b>Semua titik memenuhi syarat.</b> Tidak ada yang perlu ditindaklanjuti."; return; }
  const urut = masalah.sort((a, b) => ({ crit: 0, warn: 1, off: 2 })[a.status] - ({ crit: 0, warn: 1, off: 2 })[b.status]);
  const kalimat = urut.map((t) => {
    if (t.status === "off") return `${t.id} tidak mengirim data${t.ts ? ` sejak pukul ${hhmm(new Date(t.ts))}` : ""}`;
    if (t.jenis === "esd") return `${t.id}: uji terakhir gagal`;
    const m = Object.entries(t.statusMetrik || {}).find(([, s]) => s !== "ok");
    return m ? `${t.id}: ${NAMA_METRIK[m[0]][0].toLowerCase()} ${fmtNilai(m[0], t.nilai[m[0]])} (${ambangTeks(t.ambang[m[0]])})` : t.id;
  });
  const n = masalah.length;
  el.innerHTML = `<b>${n === 1 ? "Satu titik" : `Ada ${n} titik`} perlu perhatian.</b> ${kalimat.join("; ")}.`;
}

function renderEsd() {
  const { lulus, gagal } = snap.esd.hari_ini;
  $("esd-lulus").textContent = fmt(lulus, 0);
  const total = lulus + gagal;
  $("esd-bar").firstElementChild.style.width = total ? `${(lulus / total) * 100}%` : "0";
  $("esd-rinci").innerHTML = total
    ? `<span><b>${fmt((lulus / total) * 100, 1)}%</b> lulus dari ${fmt(total, 0)} uji</span>${gagal ? st("warn", `${fmt(gagal, 0)} gagal`) : st("ok", "Tidak ada yang gagal")}`
    : "Belum ada uji hari ini";
}

// label titik di kiri pin bila pin dekat dinding kanan ruangnya
const kiri = (t) => { const g = snap.ruang.find((r) => r.id === t.ruang).geometri; return t.x > g.x + g.w - 9; };

function renderDenah() {
  const plan = $("plan");
  plan.removeAttribute("aria-busy");
  const zona = snap.ruang.map((g) => {
    const iklim = snap.titik.find((t) => t.ruang === g.id && t.jenis === "suhu_rh" && t.status !== "off");
    const p = g.id === "airlock" ? snap.titik.find((t) => t.jenis === "tekanan") : null;
    const info = iklim ? `<span>${fmtNilai("suhu", iklim.nilai.suhu)}</span><span>${dgnSatuan(fmt(iklim.nilai.rh, 0), "%RH")}</span>`
      : p ? `<span>Beda tekanan ${fmtNilai("dp", p.nilai.dp)}</span>` : "";
    const { x, y, w, h } = g.geometri;
    // pintu menghadap koridor tengah; airlock punya pintu kedua ke luar gedung
    const pintu = y < 50 ? "p-bawah" : g.id === "airlock" ? "p-atas p-luar" : "p-atas";
    const tanda = g.status === "ok" ? "" : st(g.status, STATUS[g.status]);
    return `<div class="zona ${g.status} ${pintu}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><div class="zona-h"><b>${g.nama}</b>${tanda}</div><span class="iklim">${info}</span></div>`;
  }).join("");
  const pins = snap.titik.map((t) =>
    `<button type="button" class="pin ${t.status}" style="left:${t.x}%;top:${t.y}%" data-id="${t.id}" aria-pressed="${t.id === pilih}"
      aria-label="${t.id}, ${NAMA_JENIS[t.jenis]}, ${STATUS[t.status]}">${KODE[t.jenis]}<span class="pin-id mono${kiri(t) ? " kiri" : ""}" aria-hidden="true">${t.id}</span></button>`).join("");
  plan.innerHTML = zona + pins;
  plan.querySelectorAll(".pin").forEach((b) => b.addEventListener("click", () => { pilih = b.dataset.id; renderDenah(); renderDetail(); }));
}

function ambangTeks(a) {
  if (!a) return "";
  const [lo, hi] = a.w;
  if (lo != null && hi != null) return `syarat ${angka(lo, 0, false)} sampai ${dgnSatuan(angka(hi, 0, false), a.satuan)}`;
  return lo != null ? `minimal ${dgnSatuan(angka(lo, 0, false), a.satuan)}` : `maksimal ${dgnSatuan(angka(hi, 0, false), a.satuan)}`;
}

const nilaiBesar = (teks, u) => `${teks}<span class="u">${u === "%" ? "" : "&thinsp;"}${u}</span>`;

function renderDetail() {
  const t = byId(pilih);
  const g = snap.ruang.find((r) => r.id === t.ruang);
  $("detail-kode").textContent = t.id;
  $("detail-judul").textContent = t.nama;
  $("detail-lokasi").textContent = `${NAMA_JENIS[t.jenis]} di ${g.nama}`;
  const statusTeks = t.status === "off" ? (t.ts ? `Tidak mengirim data sejak pukul ${tsLabel(t.ts)}` : "Belum pernah mengirim data") : STATUS[t.status];
  $("detail-status").innerHTML = st(t.status, statusTeks);

  if (t.jenis === "esd") {
    const uji = snap.esd.terakhir.filter((u) => u.stasiun === t.id).slice(0, 4);
    $("detail-nilai").innerHTML = `<dl class="kv">
      <div><dt>Lulus hari ini</dt><dd class="num">${fmt(t.hari?.lulus ?? 0, 0)}</dd></div>
      <div><dt>Gagal hari ini</dt><dd class="num">${fmt(t.hari?.gagal ?? 0, 0)}</dd></div></dl>
      <p class="sub">Rentang lulus ${ambangTeks(t.ambang.mohm).replace("syarat ", "")}. Uji terakhir ${t.ts ? `pukul ${tsLabel(t.ts)}` : "belum ada"}.</p>`;
    $("detail-grafik").innerHTML = uji.length
      ? `<h3>Uji terbaru di stasiun ini</h3><ul class="uji">${uji.map((u) => `<li><span>${tsLabel(u.ts)}</span><span class="mono">${u.operator}</span><span>${dgnSatuan(fmt(u.mohm, 2), "MΩ")}</span>${st(u.hasil === "lulus" ? "ok" : "warn", u.hasil === "lulus" ? "Lulus" : "Gagal")}</li>`).join("")}</ul>`
      : `<p class="kosong">Stasiun ini tidak muncul di delapan uji terbaru.</p>`;
    return;
  }
  const metrik = Object.keys(t.ambang);
  $("detail-nilai").innerHTML = `<dl class="kv">${metrik.map((m) => `<div><dt>${NAMA_METRIK[m][0]}</dt>
    <dd class="num ${t.statusMetrik?.[m] ?? ""}">${nilaiBesar(t.status === "off" ? "-" : angka(t.nilai[m], NAMA_METRIK[m][2]), NAMA_METRIK[m][1])}</dd>
    <dd class="sub">${ambangTeks(t.ambang[m])}</dd></div>`).join("")}</dl>
    <p class="sub">${t.ts ? `Dibaca pukul ${tsLabel(t.ts)}` : "Belum ada bacaan dari titik ini."}</p>`;
  renderGrafik(t, metrik);
}

async function riwayat(t) {
  const c = riwayatCache[t.id];
  if (c && Date.now() - c.at < 60e3) return c.data;
  let data;
  if (!contohAktif) {
    const r = await fetch(`/api/titik/${t.id}/riwayat?jam=24&langkah=15`);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).galat || `HTTP ${r.status}`);
    data = (await r.json()).deret.map((d) => ({ ...d, ts: new Date(d.ts) }));
  } else {
    const x = times(96, 15);
    const s = Object.fromEntries(Object.keys(t.ambang).map((m, i) => {
      const a = t.ambang[m], [lo, hi] = a.w, mid = lo != null && hi != null ? (lo + hi) / 2 : (lo ?? hi * 0.06) * 1.3;
      return [m, gen(96, { base: t.nilai[m] ?? mid, amp: Math.abs(mid) * 0.04 + 0.5, noise: Math.abs(mid) * 0.02 + 0.3, seed: 7 + i })];
    }));
    data = x.map((ts, i) => ({ ts, ...Object.fromEntries(Object.keys(s).map((m) => [m, s[m][i]])) }));
  }
  riwayatCache[t.id] = { at: Date.now(), data };
  return data;
}

async function renderGrafik(t, metrik) {
  const box = $("detail-grafik");
  box.innerHTML = `<p class="memuat">Memuat riwayat 24 jam…</p>`;
  try {
    const data = await riwayat(t);
    if (pilih !== t.id) return;
    if (!data.length) { box.innerHTML = `<p class="kosong">Belum ada riwayat 24 jam untuk titik ini. Riwayat muncul setelah sensor atau simulator mengirim data.</p>`; return; }
    box.innerHTML = metrik.map((m) => `<h3>${NAMA_METRIK[m][0]}, 24 jam terakhir</h3><div id="g-${m}" data-label="${NAMA_METRIK[m][0]}, 24 jam terakhir"></div>`).join("");
    for (const m of metrik) {
      const a = t.ambang[m], bands = [];
      // offset ionizer: cukup tampilkan sisi yang relevan dengan nilai sekarang supaya garis tidak gepeng
      a.w.forEach((v, i) => v != null && !(m === "offset" && Math.sign(v) !== Math.sign(t.nilai.offset ?? 1)) && bands.push({ y: v, label: `batas ${i ? "atas" : "bawah"} ${angka(v, 0, false)}`, color: "var(--warn)" }));
      const nilai = data.map((d) => d[m] ?? null);
      const semua = nilai.filter((v) => v != null).concat(bands.map((b) => b.y));
      const pad = (Math.max(...semua) - Math.min(...semua)) * 0.15 || 1;
      lineChart($(`g-${m}`), { x: data.map((d) => d.ts), series: [{ name: NAMA_METRIK[m][0], color: "var(--s1)", data: nilai }],
        unit: NAMA_METRIK[m][1], dec: NAMA_METRIK[m][2], h: metrik.length > 1 ? 150 : 220, bands,
        min: Math.floor(Math.min(...semua) - pad), max: Math.ceil(Math.max(...semua) + pad) });
    }
  } catch (e) {
    box.innerHTML = `<p class="galat">Riwayat gagal dimuat (${e.message}). Pilih titik ini lagi dalam beberapa detik.</p>`;
  }
}

function renderRuang() {
  $("tabel-ruang").innerHTML = snap.ruang.map((g) => {
    const tt = snap.titik.filter((t) => t.ruang === g.id && t.status !== "off");
    const ambil = (j, m, d) => { const p = tt.find((t) => t.jenis === j); return p && p.nilai[m] != null ? angka(p.nilai[m], d) : "-"; };
    return `<tr><td>${g.nama}</td><td class="n">${ambil("suhu_rh", "suhu", 1)}</td><td class="n">${ambil("suhu_rh", "rh", 0)}</td>
      <td class="n">${ambil("partikel", "p05", 0)}</td><td class="n">${ambil("tekanan", "dp", 1)}</td><td>${st(g.status, STATUS[g.status])}</td></tr>`;
  }).join("");
  const log = snap.esd.terakhir;
  $("tabel-esd").innerHTML = log.length ? log.map((u) => `<tr><td class="n-waktu">${tsLabel(u.ts)}</td><td class="mono">${u.stasiun}</td><td class="mono">${u.operator}</td>
    <td class="n">${fmt(u.mohm, 2)}</td><td>${st(u.hasil === "lulus" ? "ok" : "warn", u.hasil === "lulus" ? "Lulus" : "Gagal")}</td></tr>`).join("")
    : `<tr><td colspan="5" class="kosong">Belum ada uji gelang hari ini.</td></tr>`;
}

if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";
mulai();
