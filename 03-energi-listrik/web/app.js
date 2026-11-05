// Dasbor energi: tarik /api/v1/dasbor tiap 60 detik dengan If-None-Match (ETag).
// 304 = tidak ada data baru, tampilan dibiarkan. Tanpa API (file:// atau stack mati) = data contoh.
const API = "/api/v1/dasbor";
const POLL_MS = 60000;
let etag = null;
let terakhir = null;

const $ = (id) => document.getElementById(id);
const jamMenit = (iso) => hhmm(new Date(iso));

function contoh() {
  const x = times(96, 15);
  const kw = gen(96, { base: 1080, amp: 260, noise: 50, seed: 3 });
  [1452, 1497, 1528, 1541, 1503].forEach((v, k) => (kw[83 + k] = v));
  const jam = [720, 690, 680, 700, 740, 860, 1010, 1180, 1290, 1340, 1360, 1310, 1240, 1495, 1330];
  const area = [["SDP-SMT", "Oven reflow (2 lini)", 4210], ["SDP-HVAC", "HVAC produksi", 2950], ["SDP-KMP", "Kompresor & utilitas", 2380],
    ["SDP-TV", "Perakitan TV", 1640], ["SDP-KLK", "Perakitan kulkas", 1420], ["SDP-GDG", "Gudang & cold storage", 870], ["SDP-KTR", "Kantor & lain-lain", 400]];
  const p = (id, nama, area, kw, v, i, tak, pf, thd, masalah = []) =>
    ({ id, nama, area, kw, v, i, ketidakseimbangan_arus_persen: tak, pf, thd_i_persen: thd, status: masalah.length ? "peringatan" : "normal", masalah });
  return {
    ringkasan: {
      tanggal: "2026-11-05", batas_kontrak_kw: 1600, beban_sekarang_kw: 1284, beban_sekarang_ts: x[95].toISOString(),
      puncak_hari_ini: { kw: 1587, ts: x[86].toISOString() }, sisa_kapasitas_kw: 13,
      penyumbang_puncak: [{ area: "Oven reflow (2 lini)", kw_rata: 471 }, { area: "HVAC produksi", kw_rata: 322 }],
      energi_hari_ini_kwh: 14870, pf_rata_hari_ini: 0.91, data_sampai: x[95].toISOString(),
    },
    beban_24_jam: x.map((t, i) => ({ ts: t.toISOString(), kw: kw[i], kw_maks: kw[i] * 1.03 })),
    energi_per_jam: Array.from({ length: 24 }, (_, j) => ({ jam: j, kwh: jam[j] ?? null })),
    per_area: area.map(([id, a, kwh]) => ({ id, area: a, kwh })),
    panel: [
      p("MDP", "Panel utama (MDP)", "Seluruh pabrik", 1284, [229, 231, 228], [1084, 1060, 1102], 2.2, 0.92, 6.1),
      p("SDP-SMT", "SDP SMT", "Oven reflow (2 lini)", 482, [228, 230, 229], [412, 398, 405], 1.7, 0.95, 4.8),
      p("SDP-KMP", "SDP Kompresor", "Kompresor & utilitas", 211, [226, 229, 227], [318, 262, 301], 12.4, 0.82, 9.7, ["Faktor daya rendah", "Arus tidak seimbang"]),
      p("SDP-HVAC", "SDP HVAC", "HVAC produksi", 305, [230, 231, 229], [489, 470, 482], 2.1, 0.91, 6.2),
      p("SDP-TV", "SDP Perakitan TV", "Perakitan TV", 192, [230, 231, 230], [148, 151, 146], 1.8, 0.93, 11.4),
      p("SDP-KLK", "SDP Perakitan kulkas", "Perakitan kulkas", 140, [231, 230, 231], [219, 212, 222], 2.4, 0.92, 8.9),
      p("SDP-GDG", "SDP Gudang", "Gudang & cold storage", 86, [231, 232, 231], [66, 64, 70], 5.3, 0.89, 5.2),
      p("SDP-KTR", "SDP Kantor", "Kantor & lain-lain", 44, [230, 230, 231], [64, 62, 66], 3.2, 0.96, 7.5),
    ],
  };
}

function render(d, modeContoh) {
  const r = d.ringkasan;
  const batas = r.batas_kontrak_kw;
  $("tanggal").textContent = new Date(r.tanggal + "T00:00:00+07:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const sisa = r.sisa_kapasitas_kw;
  $("sisa").textContent = sisa == null ? "-" : fmt(sisa, 0);
  document.querySelector(".raksasa").classList.toggle("lewat", sisa != null && sisa < 0);
  const pk = r.puncak_hari_ini;
  const [a1, a2] = r.penyumbang_puncak;
  $("temuan").innerHTML = sisa == null ? "Belum ada pembacaan hari ini."
    : sisa < 0 ? `<b>Beban melewati batas kontrak ${fmt(-sisa, 0)} kW pada pukul ${jamMenit(pk.ts)}.</b> Periksa jadwal mesin besar yang menyala bersamaan.`
    : `<b>Puncak hari ini ${fmt(pk.kw, 0)} kW pada pukul ${jamMenit(pk.ts)}.</b> ${a1 && a2 ? `Saat itu ${a1.area} dan ${a2.area} menyumbang beban terbesar.` : ""}`;
  $("puncak").textContent = pk ? `${fmt(pk.kw, 0)} kW, pukul ${jamMenit(pk.ts)}` : "-";
  $("batas").textContent = `${fmt(batas, 0)} kW`;
  $("penyumbang").textContent = r.penyumbang_puncak.map((p) => `${p.area} ${fmt(p.kw_rata, 0)} kW`).join("; ") || "-";

  $("k-beban").innerHTML = `${fmt(r.beban_sekarang_kw ?? 0, 0)}<small>kW</small>`;
  $("k-beban-ts").textContent = r.beban_sekarang_ts ? `dibaca pukul ${jamMenit(r.beban_sekarang_ts)}` : "-";
  const roda = (t) => `<span class="roda"><span class="vh">${t}</span>${[...t].map((c) => (/\d/.test(c) ? `<i aria-hidden="true">${c}</i>` : `<b aria-hidden="true">${c}</b>`)).join("")}</span>`;
  $("k-energi").innerHTML = `${roda(fmt(r.energi_hari_ini_kwh ?? 0, 0))}<small>kWh</small>`;
  $("k-energi-d").textContent = r.data_sampai ? `00.00 sampai ${jamMenit(r.data_sampai)}` : "-";
  $("k-pf").textContent = r.pf_rata_hari_ini == null ? "-" : fmt(r.pf_rata_hari_ini, 2);

  // momen: beban 24 jam dengan garis batas kontrak
  const b = d.beban_24_jam;
  const x = b.map((p) => new Date(p.ts));
  const kw = b.map((p) => p.kw);
  const iMax = kw.indexOf(Math.max(...kw));
  lineChart($("grafik-beban"), {
    x, h: innerWidth > 1280 ? 420 : 300, unit: "kW", dec: 0, min: 0, max: Math.ceil((batas * 1.15) / 200) * 200,
    series: [{ name: "Beban", color: "var(--s1)", data: kw }],
    bands: [{ y: batas, label: `batas kontrak ${fmt(batas, 0)} kW`, color: "var(--crit)" }],
    marks: [{ i: iMax, label: `tertinggi 24 jam ${fmt(kw[iMax], 0)} kW` }],
  });

  barsBatas($("grafik-jam"), d.energi_per_jam, batas);

  const total = d.per_area.reduce((s, a) => s + a.kwh, 0) || 1;
  const maks = Math.max(...d.per_area.map((a) => a.kwh), 1);
  $("area").innerHTML = d.per_area.map((a) => `<li>
      <span class="nm">${a.area}</span>
      <span class="bar"><span style="width:${(a.kwh / maks) * 100}%"></span></span>
      <span class="num">${fmt(a.kwh, 0)}</span><span class="pct num">${fmt((a.kwh / total) * 100, 0)} %</span></li>`).join("");

  $("panel-ts").textContent = `pembacaan sesaat, pukul ${jamMenit(r.beban_sekarang_ts)}`;
  $("panel").innerHTML = d.panel.map((p) => {
    const tanda = (k) => p.masalah.some((m) => m.startsWith(k)) ? ' class="n buruk"' : ' class="n"';
    return `<tr${p.jenis === "utama" || p.id === "MDP" ? ' class="utama"' : ""}>
      <td>${p.nama}<span class="sub">${p.area}</span></td>
      ${p.v.map((v) => `<td class="n">${fmt(v, 0)}</td>`).join("")}
      ${p.i.map((v) => `<td class="n">${fmt(v, 0)}</td>`).join("")}
      <td${tanda("Arus")}>${fmt(p.ketidakseimbangan_arus_persen, 1)} %</td>
      <td${tanda("Faktor")}>${fmt(p.pf, 2)}</td>
      <td${tanda("THD")}>${fmt(p.thd_i_persen, 1)} %</td>
      <td class="n">${fmt(p.kw, 0)}</td>
      <td>${p.masalah.length ? st("warn", p.masalah.join(", ")) : st("ok")}</td></tr>`;
  }).join("");
  $("isi").setAttribute("aria-busy", "false");
}

// Batang energi per jam + garis batas kontrak (batas kW × 1 jam = kWh maksimum per jam)
function barsBatas(el, rows, batas) {
  const W = el.clientWidth || 700, H = 300, L = 48, R = 8, T = 16, B = 24;
  const hi = Math.ceil((batas * 1.12) / 400) * 400;
  const bw = (W - L - R) / 24;
  const sy = (v) => T + (1 - v / hi) * (H - T - B);
  const vals = rows.map((r) => r.kwh);
  const iMax = vals.indexOf(Math.max(...vals.filter((v) => v != null)));
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (hi * k) / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`;
  }
  rows.forEach((r, i) => {
    const x0 = L + i * bw + 2, w = bw - 4;
    if (i % (W < 600 ? 6 : 3) === 0) g += `<text x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">${String(r.jam).padStart(2, "0")}.00</text>`;
    if (r.kwh == null) return;
    const y = sy(r.kwh), rad = Math.min(3, w / 2);
    g += `<path d="M${x0},${H - B}V${y + rad}q0,-${rad} ${rad},-${rad}h${w - 2 * rad}q${rad},0 ${rad},${rad}V${H - B}z" fill="${i === iMax ? "var(--s1)" : "var(--s3)"}"><title>${String(r.jam).padStart(2, "0")}.00: ${fmt(r.kwh, 0)} kWh</title></path>`;
  });
  g += `<line x1="${L}" x2="${W - R}" y1="${sy(batas)}" y2="${sy(batas)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
        <text x="${W - R}" y="${sy(batas) - 5}" text-anchor="end" style="fill:var(--ink-2)">batas kontrak × 1 jam = ${fmt(batas, 0)} kWh</text>`;
  el.classList.add("chart");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${el.dataset.label}">${g}</svg>`;
}

function koneksi(teks, kelas) {
  const k = $("koneksi");
  k.textContent = teks;
  k.className = "koneksi " + kelas;
}

function modeContoh(sebab) {
  const b = $("banner");
  b.hidden = false;
  b.innerHTML = `<b>Mode data contoh: API tidak terhubung.</b> ${sebab} Jalankan <code>docker compose -p konsep-03 up -d</code> lalu buka <code>http://localhost:18030</code>.`;
  // pratinjau: API sengaja mati, status netral (bukan galat)
  if (PRATINJAU) koneksi(`Pembacaan sampai pukul ${hhmm(NOW)}`, "");
  else koneksi("Tidak terhubung", "putus");
  if (!terakhir) render(contoh(), true);
}

async function tarik() {
  if (TANPA_API) return modeContoh("Halaman dibuka langsung dari berkas.");
  try {
    const r = await fetch(API, { cache: "no-store", headers: etag ? { "If-None-Match": etag } : {} });
    if (r.status === 304) return koneksi(`Terhubung · tidak ada data baru, dicek ${hhmm(new Date())}`, "ok");
    if (!r.ok) {
      const g = await r.json().catch(() => ({}));
      throw new Error(g.galat || `Server menjawab ${r.status}.`);
    }
    etag = r.headers.get("ETag");
    terakhir = await r.json();
    $("banner").hidden = true;
    render(terakhir, false);
    koneksi(`Terhubung · diperbarui ${hhmm(new Date())}`, "ok");
  } catch (e) {
    if (terakhir) return koneksi(`Gagal memperbarui pukul ${hhmm(new Date())}; menampilkan data terakhir`, "putus");
    modeContoh(e instanceof TypeError ? "Server API tidak bisa dihubungi." : e.message);
  }
}

if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";
tarik();
setInterval(tarik, POLL_MS);
addEventListener("resize", () => (terakhir ? render(terakhir, false) : TANPA_API ? render(contoh(), true) : null));
