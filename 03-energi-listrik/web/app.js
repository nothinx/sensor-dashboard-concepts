// Dasbor energi: tarik /api/v1/dasbor tiap 60 detik dengan If-None-Match (ETag).
// 304 = tidak ada data baru, tampilan dibiarkan. Tanpa API (file:// atau stack mati) = data contoh.
const API = "/api/v1/dasbor";
const POLL_MS = 60000;
let etag = null;
let terakhir = null;

const $ = (id) => document.getElementById(id);
const jamMenit = (iso) => hhmm(new Date(iso));
// angka + satuan: satuan lebih kecil dan redup, dipisah spasi tipis
const nu = (v, d, u) => `${fmt(v, d)}&thinsp;<span class="u">${u}</span>`;
// nama di tengah kalimat: "Oven reflow" jadi "oven reflow", singkatan seperti "HVAC" dibiarkan
const kecil = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

function contoh() {
  // Satu deret 15 menit menjadi sumber semua angka contoh supaya angka besar, grafik, KPI, dan tabel saling cocok.
  const x = times(96, 15);
  const dasar = gen(96, { base: 1080, amp: 260, noise: 50, seed: 3 });
  const kw = dasar.map((_, i) => Math.round(dasar[(i + 64) % 96])); // geser: beban rendah malam, tinggi siang
  [1452, 1497, 1541, 1587, 1503].forEach((v, k) => (kw[83 + k] = v)); // dua oven reflow menyala bersamaan
  const batas = 1600;
  const awalHari = x.findIndex((t) => t.getDate() === NOW.getDate());
  const hari = kw.slice(awalHari);
  const iPuncak = awalHari + hari.indexOf(Math.max(...hari));
  const energi = Math.round(hari.reduce((s, v) => s + v / 4, 0));
  const jam = Array.from({ length: 24 }, (_, j) => {
    const isi = kw.filter((_, i) => i >= awalHari && x[i].getHours() === j);
    return { jam: j, kwh: isi.length === 4 ? Math.round(isi.reduce((s, v) => s + v / 4, 0)) : null };
  });
  const bagian = [["SDP-SMT", "Oven reflow (2 lini)", 0.30], ["SDP-HVAC", "HVAC produksi", 0.21], ["SDP-KMP", "Kompresor & utilitas", 0.17],
    ["SDP-TV", "Perakitan TV", 0.12], ["SDP-KLK", "Perakitan kulkas", 0.10], ["SDP-GDG", "Gudang & cold storage", 0.06]];
  const per_area = bagian.map(([id, area, f]) => ({ id, area, kwh: Math.round(energi * f) }));
  per_area.push({ id: "SDP-KTR", area: "Kantor & lain-lain", kwh: energi - per_area.reduce((s, a) => s + a.kwh, 0) });
  const kini = kw[95];
  // arus per fasa dari daya: I = P / (3 × V fasa-netral × PF), lalu dibuat tak seimbang sesuai faktor per fasa
  const p = (id, nama, area, f, v, pf, thd, ff, masalah = []) => {
    const daya = Math.round(kini * f);
    const rata = (daya * 1000) / (3 * (v.reduce((s, a) => s + a, 0) / 3) * pf);
    const i = ff.map((k) => Math.round(rata * k));
    const mi = i.reduce((s, a) => s + a, 0) / 3;
    const tak = (Math.max(...i.map((a) => Math.abs(a - mi))) / mi) * 100;
    return { id, nama, area, kw: daya, v, i, ketidakseimbangan_arus_persen: tak, pf, thd_i_persen: thd, status: masalah.length ? "peringatan" : "normal", masalah };
  };
  return {
    ringkasan: {
      tanggal: "2026-11-05", batas_kontrak_kw: batas, beban_sekarang_kw: kini, beban_sekarang_ts: x[95].toISOString(),
      puncak_hari_ini: { kw: kw[iPuncak], ts: x[iPuncak].toISOString() }, sisa_kapasitas_kw: batas - kw[iPuncak],
      penyumbang_puncak: [{ area: "Oven reflow (2 lini)", kw_rata: 471 }, { area: "HVAC produksi", kw_rata: 322 }],
      energi_hari_ini_kwh: energi, pf_rata_hari_ini: 0.91, data_sampai: x[95].toISOString(),
    },
    beban_24_jam: x.map((t, i) => ({ ts: t.toISOString(), kw: kw[i], kw_maks: Math.round(kw[i] * 1.03) })),
    energi_per_jam: jam,
    per_area,
    panel: [
      p("MDP", "Panel utama (MDP)", "Seluruh pabrik", 1, [229, 231, 228], 0.92, 6.1, [1, 0.98, 1.02]),
      p("SDP-SMT", "SDP SMT", "Oven reflow (2 lini)", 0.31, [228, 230, 229], 0.95, 4.8, [1.01, 0.98, 1.01]),
      p("SDP-KMP", "SDP Kompresor", "Kompresor & utilitas", 0.16, [226, 229, 227], 0.82, 9.7, [1.07, 0.88, 1.05], ["Faktor daya rendah", "Arus tidak seimbang"]),
      p("SDP-HVAC", "SDP HVAC", "HVAC produksi", 0.22, [230, 231, 229], 0.91, 6.2, [1.01, 0.97, 1.02]),
      p("SDP-TV", "SDP Perakitan TV", "Perakitan TV", 0.11, [230, 231, 230], 0.93, 11.4, [0.99, 1.02, 0.99]),
      p("SDP-KLK", "SDP Perakitan kulkas", "Perakitan kulkas", 0.09, [231, 230, 231], 0.92, 8.9, [1, 0.97, 1.03]),
      p("SDP-GDG", "SDP Gudang", "Gudang & cold storage", 0.06, [231, 232, 231], 0.89, 5.2, [1, 0.95, 1.05]),
      p("SDP-KTR", "SDP Kantor", "Kantor & lain-lain", 0.03, [230, 230, 231], 0.96, 7.5, [1.02, 0.97, 1.01]),
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
    : sisa < 0 ? `<b>Beban melewati batas kontrak ${fmt(-sisa, 0)} kW pukul ${jamMenit(pk.ts)}.</b> Periksa mesin besar yang menyala bersamaan.`
    : `<b>Puncak hari ini ${fmt(pk.kw, 0)} kW pukul ${jamMenit(pk.ts)}.</b> ${a1 && a2 ? `Bebannya terutama dari <span class="nw">${kecil(a1.area)}</span> dan <span class="nw">${kecil(a2.area)}</span>.` : ""}`;
  $("puncak").innerHTML = pk ? `${nu(pk.kw, 0, "kW")}, pukul ${jamMenit(pk.ts)}` : "Belum ada";
  $("batas").innerHTML = nu(batas, 0, "kW");
  $("penyumbang").innerHTML = r.penyumbang_puncak.map((p) => `<span class="baris">${p.area} ${nu(p.kw_rata, 0, "kW")}</span>`).join("") || "Belum ada";

  $("k-beban").innerHTML = r.beban_sekarang_kw == null ? "-" : nu(r.beban_sekarang_kw, 0, "kW");
  $("k-beban-ts").textContent = r.beban_sekarang_ts ? `Dibaca pukul ${jamMenit(r.beban_sekarang_ts)}` : "Belum ada pembacaan";
  const roda = (t) => `<span class="roda"><span class="vh">${t}</span>${[...t].map((c) => (/\d/.test(c) ? `<i aria-hidden="true">${c}</i>` : `<b aria-hidden="true">${c}</b>`)).join("")}</span>`;
  $("k-energi").innerHTML = `${roda(fmt(r.energi_hari_ini_kwh ?? 0, 0))}<span class="u">kWh</span>`;
  $("k-energi-d").textContent = r.data_sampai ? `Pukul 00.00 sampai ${jamMenit(r.data_sampai)}` : "Belum ada pembacaan";
  $("k-pf").textContent = r.pf_rata_hari_ini == null ? "-" : fmt(r.pf_rata_hari_ini, 2);

  // momen: beban 24 jam dengan garis batas kontrak
  const b = d.beban_24_jam;
  const x = b.map((p) => new Date(p.ts));
  const kw = b.map((p) => p.kw);
  const iMax = kw.indexOf(Math.max(...kw));
  lineChart($("grafik-beban"), {
    x, h: innerWidth > 1280 ? 440 : 300, unit: "kW", dec: 0, min: 0, max: Math.ceil((batas * 1.15) / 200) * 200,
    series: [{ name: "Beban", color: "var(--s1)", data: kw }],
    bands: [{ y: batas, label: `Batas kontrak ${fmt(batas, 0)} kW`, color: "var(--crit)" }],
    marks: [{ i: iMax, label: `Tertinggi ${fmt(kw[iMax], 0)} kW, pukul ${hhmm(x[iMax])}` }],
  });

  barsBatas($("grafik-jam"), d.energi_per_jam, batas);

  const total = d.per_area.reduce((s, a) => s + a.kwh, 0) || 1;
  const maks = Math.max(...d.per_area.map((a) => a.kwh), 1);
  $("area").innerHTML = d.per_area.map((a) => `<li>
      <span class="nm">${a.area}</span>
      <span class="bar"><span style="width:${(a.kwh / maks) * 100}%"></span></span>
      <span class="num">${fmt(a.kwh, 0)}</span><span class="pct num">${fmt((a.kwh / total) * 100, 0)}%</span></li>`).join("");

  $("panel-ts").textContent = `Pembacaan sesaat pukul ${jamMenit(r.beban_sekarang_ts)}`;
  $("panel").innerHTML = d.panel.map((p) => {
    const tanda = (k) => p.masalah.some((m) => m.startsWith(k)) ? ' class="n buruk"' : ' class="n"';
    return `<tr${p.jenis === "utama" || p.id === "MDP" ? ' class="utama"' : ""}>
      <td>${p.nama}<span class="sub">${p.area}</span></td>
      ${p.v.map((v) => `<td class="n">${fmt(v, 0)}</td>`).join("")}
      ${p.i.map((v) => `<td class="n">${fmt(v, 0)}</td>`).join("")}
      <td${tanda("Arus")}>${fmt(p.ketidakseimbangan_arus_persen, 1)}%</td>
      <td${tanda("Faktor")}>${fmt(p.pf, 2)}</td>
      <td${tanda("THD")}>${fmt(p.thd_i_persen, 1)}%</td>
      <td class="n">${fmt(p.kw, 0)}</td>
      <td>${p.masalah.length ? st("warn", p.masalah.map((m, k) => (k ? m.toLowerCase() : m)).join(", ")) : st("ok")}</td></tr>`;
  }).join("");
  $("isi").setAttribute("aria-busy", "false");
}

// Batang energi per jam + garis batas kontrak (batas kW selama 1 jam = kWh maksimum per jam)
function barsBatas(el, rows, batas) {
  const W = el.clientWidth || 700, H = 300, L = 48, R = 8, T = 24, B = 24;
  const hi = Math.ceil((batas * 1.12) / 400) * 400;
  const bw = (W - L - R) / 24;
  const sy = (v) => T + (1 - v / hi) * (H - T - B);
  const vals = rows.map((r) => r.kwh);
  const iMax = vals.indexOf(Math.max(...vals.filter((v) => v != null)));
  const jj = (j) => `${String(j).padStart(2, "0")}.00`;
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (hi * k) / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`;
  }
  rows.forEach((r, i) => {
    const x0 = L + i * bw + 2, w = bw - 4;
    if (i % (W < 600 ? 6 : 3) === 0) g += `<text x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">${jj(r.jam)}</text>`;
    if (r.kwh == null) return;
    const y = sy(r.kwh), rad = Math.min(2, w / 2);
    g += `<path d="M${x0},${H - B}V${y + rad}q0,-${rad} ${rad},-${rad}h${w - 2 * rad}q${rad},0 ${rad},${rad}V${H - B}z" fill="${i === iMax ? "var(--s1)" : "var(--s3)"}"><title>Pukul ${jj(r.jam)}: ${fmt(r.kwh, 0)} kWh</title></path>`;
  });
  g += `<line x1="${L}" x2="${W - R}" y1="${sy(batas)}" y2="${sy(batas)}" stroke="var(--crit)" stroke-width="1.5" stroke-dasharray="5 4"/>
        <text x="${W - R}" y="${sy(batas) - 8}" text-anchor="end" class="halo" style="fill:var(--ink-2)">Batas kontrak selama 1 jam, ${fmt(batas, 0)} kWh</text>`;
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
  b.innerHTML = `<b>Server tidak terhubung, layar menampilkan data contoh.</b> ${sebab} Jalankan <code>docker compose -p konsep-03 up -d</code> lalu buka <code>http://localhost:18030</code>.`;
  // pratinjau: API sengaja mati, status netral (bukan galat)
  if (PRATINJAU) koneksi(`Pembacaan sampai pukul ${hhmm(NOW)}`, "");
  else koneksi("Tidak terhubung", "putus");
  if (!terakhir) render(contoh(), true);
}

async function tarik() {
  if (TANPA_API) return modeContoh("Halaman dibuka langsung dari berkas.");
  try {
    const r = await fetch(API, { cache: "no-store", headers: etag ? { "If-None-Match": etag } : {} });
    if (r.status === 304) return koneksi(`Terhubung, belum ada data baru (dicek pukul ${hhmm(new Date())})`, "ok");
    if (!r.ok) {
      const g = await r.json().catch(() => ({}));
      throw new Error(g.galat || `Server membalas dengan kode ${r.status}.`);
    }
    etag = r.headers.get("ETag");
    terakhir = await r.json();
    $("banner").hidden = true;
    render(terakhir, false);
    koneksi(`Terhubung, diperbarui pukul ${hhmm(new Date())}`, "ok");
  } catch (e) {
    if (terakhir) return koneksi(`Gagal memperbarui pukul ${hhmm(new Date())}. Menampilkan data terakhir.`, "putus");
    modeContoh(e instanceof TypeError ? "Server tidak bisa dihubungi." : e.message);
  }
}

if (PRATINJAU) document.querySelector("[data-pratinjau]").textContent = "Pratinjau, data contoh";
tarik();
setInterval(tarik, POLL_MS);
addEventListener("resize", () => (terakhir ? render(terakhir, false) : TANPA_API ? render(contoh(), true) : null));
