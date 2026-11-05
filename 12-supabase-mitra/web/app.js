// Portal Mitra Servis: supabase-js langsung dari peramban. Keamanan ada di database (Row Level Security):
// kunci anon hanya bisa masuk lewat login, dan setiap kueri otomatis dibatasi ke mitra milik pengguna.
// Tiket baru dan perubahan status datang lewat Supabase Realtime (postgres_changes, tetap tunduk RLS).
// Tanpa Supabase (dibuka via file:// atau layanan mati), portal memakai data contoh bawaan.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const STATUS = { baru: ["crit", "Baru"], dijadwalkan: ["off", "Dijadwalkan"], dikerjakan: ["warn", "Dikerjakan"], selesai: ["ok", "Selesai"] };
const PRIORITAS = { tinggi: "prioritas tinggi", sedang: "prioritas sedang", rendah: "prioritas rendah" };
const tglJam = (s) => { const d = new Date(s); return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, ${hhmm(d)}`; };

let sb = null, mode = "api", data = null, saya = null, kanal = null;

function durasi(menit) {
  const m = Math.abs(Math.round(menit));
  return m >= 60 ? `${Math.floor(m / 60)} j ${String(m % 60).padStart(2, "0")} m` : `${m} m`;
}

// ---------- muat data ----------
async function muat() {
  if (mode === "contoh") { data = contoh(); return gambar(); }
  const sejak = new Date(Date.now() - 30 * 864e5).toISOString();
  const [terbuka, riwayat, kinerja] = await Promise.all([
    sb.from("tiket").select("id, nomor, keluhan, prioritas, status, dibuat_pada, batas_tanggap, ditanggapi_pada, jadwal_kunjungan, unit:unit(serial, model, kota, pelanggan_ref)")
      .neq("status", "selesai").order("batas_tanggap"),
    sb.from("tiket").select("unit_serial, keluhan, dibuat_pada, unit:unit(model, pelanggan_ref)").gte("dibuat_pada", sejak).order("dibuat_pada", { ascending: false }),
    sb.rpc("kinerja_mitra", { hari: 30 }),
  ]);
  const galat = terbuka.error || riwayat.error || kinerja.error;
  if (galat) throw new Error(galat.message);
  data = { terbuka: terbuka.data, riwayat: riwayat.data, kinerja: kinerja.data[0] };
  $("sumber").className = "sumber live";
  $("sumber").textContent = `Supabase Realtime · ${hhmm(new Date())}`;
  gambar();
}

// ---------- gambar ----------
function gambar() {
  const sekarang = Date.now();
  const menunggu = data.terbuka.filter((t) => t.status === "baru")
    .map((t) => ({ ...t, sisa: (new Date(t.batas_tanggap) - sekarang) / 6e4, total: (new Date(t.batas_tanggap) - new Date(t.dibuat_pada)) / 6e4 }))
    .sort((a, b) => a.sisa - b.sisa);
  const berjalan = data.terbuka.filter((t) => t.status !== "baru");
  const lewat = menunggu.filter((t) => t.sisa < 0);

  $("temuan").innerHTML = !menunggu.length
    ? "<b>Semua tiket sudah ditanggapi.</b> Tiket baru dari pabrik akan muncul di sini tanpa perlu memuat ulang."
    : lewat.length
      ? `<b>${lewat.length} tiket sudah melewati batas tanggap SLA.</b> Tanggapi lebih dulu; keterlambatan tercatat di kinerja 30 hari.`
      : `<b>${menunggu.length} tiket menunggu tanggapan; yang paling mendesak harus ditanggapi dalam ${durasi(menunggu[0].sisa)}.</b> Tanggapi dengan menjadwalkan kunjungan teknisi.`;

  // papan dispatcher: lajur menurut sisa waktu tanggap, dari paling mendesak di kiri
  $("jam").textContent = hhmm(new Date());
  $("tanggal").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const LAJUR = [["lewat", "Lewat batas", (x) => x < 0], ["mepet", "Kurang dari 1 jam", (x) => x < 60], ["hari", "1 sampai 8 jam", (x) => x < 480], ["longgar", "Lebih dari 8 jam", () => true]];
  const kartu = (t) => {
    const kelas = t.sisa < 0 ? "terlambat" : t.sisa < 60 ? "mepet" : "";
    const pakai = Math.min(100, Math.max(0, 100 * (1 - t.sisa / t.total)));
    return `<li class="tiket ${kelas}">
      <span class="badge" title="${esc(saya.mitra.nama)}">${esc(saya.mitra.kode)}</span>
      <span class="nomor">${esc(t.nomor)} · ${PRIORITAS[t.prioritas]}</span>
      <h3>${esc(t.keluhan)}</h3>
      <p class="unit">${esc(t.unit.model)} · <span class="mono">${esc(t.unit.serial)}</span> · ${esc(t.unit.kota)}</p>
      <div class="sisa"><span class="angka">${t.sisa < 0 ? "+" : ""}${durasi(t.sisa)}</span>
        <span class="ket">${t.sisa < 0 ? "lewat batas tanggap" : `sisa sampai batas pukul ${hhmm(new Date(t.batas_tanggap))}`}</span></div>
      <div class="waktu-bar" role="img" aria-label="${Math.round(pakai)} % waktu tanggap terpakai"><i style="width:${pakai}%"></i></div>
      <div class="bawah"><span class="muted">masuk ${tglJam(t.dibuat_pada)}</span>
        <button class="btn primary" type="button" data-tanggapi="${t.id}">Tanggapi dan jadwalkan</button></div>
    </li>`;
  };
  const sisa = [...menunggu];
  $("papan-sla").innerHTML = menunggu.length ? LAJUR.map(([k, judul, cocok]) => {
    const isi = sisa.filter((t) => cocok(t.sisa));
    isi.forEach((t) => sisa.splice(sisa.indexOf(t), 1));
    return `<section class="lajur l-${k}${isi.length ? "" : " kosong"}" aria-label="${judul}, ${isi.length} tiket">
      <div class="lajur-h"><span>${judul}</span><b>${isi.length}</b></div>
      <ol>${isi.length ? isi.map(kartu).join("") : `<li class="slot-kosong">Tidak ada tiket</li>`}</ol></section>`;
  }).join("") : `<p class="kosong">Tidak ada tiket yang menunggu tanggapan.</p>`;

  $("tbl-berjalan").innerHTML = berjalan.length ? berjalan.map((t) => `<tr>
      <td class="mono">${esc(t.nomor)}</td><td>${esc(t.unit.model)}<br><span class="mono muted">${esc(t.unit.serial)}</span></td>
      <td>${esc(t.keluhan)}</td><td>${st(...STATUS[t.status])}</td><td>${t.jadwal_kunjungan ? tglJam(t.jadwal_kunjungan) : "-"}</td></tr>`).join("")
    : `<tr><td colspan="5" class="kosong">Belum ada tiket berjalan.</td></tr>`;

  const per = {};
  for (const r of data.riwayat) (per[r.unit_serial] ??= []).push(r);
  const ulang = Object.entries(per).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  $("tbl-unit").innerHTML = ulang.length ? ulang.map(([s, v]) => `<tr><td class="mono">${esc(s)}</td><td>${esc(v[0].unit.model)}</td>
      <td class="mono">${esc(v[0].unit.pelanggan_ref)}</td><td class="n">${v.length}</td><td>${esc(v[0].keluhan)} <span class="muted">(${tglJam(v[0].dibuat_pada)})</span></td></tr>`).join("")
    : `<tr><td colspan="5" class="kosong">Tidak ada unit dengan tiket berulang dalam 30 hari.</td></tr>`;

  const k = data.kinerja || {};
  const baris = (label, saya_, semua, satuan, lebihBaikKecil) => {
    const maks = Math.max(saya_ ?? 0, semua ?? 0, 1);
    return `<div class="banding"><div class="l">${label}</div>
      <div class="baris saya"><span>Mitra Anda</span><span class="bar"><i style="width:${(100 * (saya_ ?? 0)) / maks}%"></i></span><span class="v">${saya_ == null ? "-" : fmt(+saya_, satuan === "%" ? 1 : 0)} ${satuan}</span></div>
      <div class="baris"><span>Semua mitra</span><span class="bar"><i style="width:${(100 * (semua ?? 0)) / maks}%"></i></span><span class="v">${semua == null ? "-" : fmt(+semua, satuan === "%" ? 1 : 0)} ${satuan}</span></div>
      ${saya_ != null && semua != null ? `<p class="muted" style="margin-top:4px">${(lebihBaikKecil ? +saya_ <= +semua : +saya_ >= +semua) ? "Lebih baik dari atau sama dengan rata-rata." : "Di bawah rata-rata semua mitra."}</p>` : ""}</div>`;
  };
  $("kinerja-isi").innerHTML = baris("Waktu tanggap rata-rata", k.tanggap_saya_menit, k.tanggap_semua_menit, "menit", true)
    + baris("Tiket ditanggapi tepat SLA", k.tepat_sla_saya, k.tepat_sla_semua, "%", false)
    + `<p class="muted">${fmt(+(k.tiket_saya ?? 0), 0)} tiket mitra Anda dalam 30 hari. Nama mitra lain tidak ditampilkan.</p>`;
}

// ---------- aksi ----------
async function tanggapi(id, tombol) {
  tombol.disabled = true;
  tombol.textContent = "Menyimpan…";
  const besok = new Date(); besok.setDate(besok.getDate() + 1); besok.setHours(9, 0, 0, 0);
  if (mode === "contoh") {
    Object.assign(data.terbuka.find((t) => t.id === id), { status: "dijadwalkan", ditanggapi_pada: new Date().toISOString(), jadwal_kunjungan: besok.toISOString() });
    toast("Tiket ditanggapi (data contoh, tidak tersimpan).");
    return gambar();
  }
  const { error } = await sb.from("tiket").update({ status: "dijadwalkan", ditanggapi_pada: new Date().toISOString(), jadwal_kunjungan: besok.toISOString() }).eq("id", id);
  if (error) { tombol.disabled = false; tombol.textContent = "Tanggapi dan jadwalkan"; return toast(`Gagal menyimpan: ${error.message}. Coba lagi.`); }
  toast("Tiket ditanggapi; kunjungan dijadwalkan besok pukul 09.00.");
  await muat();
}

function toast(teks) {
  const t = $("toast");
  t.textContent = teks;
  t.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { t.hidden = true; }, 4000);
}

// ---------- sesi ----------
async function masukPortal(session) {
  $("layar-masuk").hidden = true;
  $("portal").hidden = false;
  if (mode === "contoh") {
    saya = { nama: "Koordinator Semarang", mitra: { kode: "SMG", nama: "Mitra Servis Semarang", kota: "Semarang" } };
  } else {
    const { data: p, error } = await sb.from("profil").select("nama, mitra:mitra(kode, nama, kota)").single();
    if (error) { $("temuan").textContent = `Profil mitra tidak ditemukan untuk akun ini (${error.message}). Hubungi admin pabrik.`; return; }
    saya = p;
    kanal = sb.channel("tiket-mitra")
      .on("postgres_changes", { event: "*", schema: "public", table: "tiket" }, (e) => {
        if (e.eventType === "INSERT") toast(`Tiket baru ${e.new.nomor}: ${e.new.keluhan}`);
        muat().catch((x) => toast(`Gagal memperbarui: ${x.message}`));
      })
      .subscribe();
  }
  $("mitra-nama").textContent = `${saya.mitra.nama} · ${saya.mitra.kota}`;
  $("pengguna").textContent = mode === "contoh" ? saya.nama : `${saya.nama} · ${session.user.email}`;
  try { await muat(); } catch (e) { $("temuan").textContent = `Data tidak bisa dimuat: ${e.message}. Muat ulang halaman.`; }
}

function tampilMasuk() {
  $("portal").hidden = true;
  $("layar-masuk").hidden = false;
  $("akun-contoh").hidden = window.KONFIG?.target !== "emulator";
}

async function mulai() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tanggapi]");
    if (t) tanggapi(+t.dataset.tanggapi, t);
    const a = e.target.closest(".isi-akun");
    if (a) { $("form-masuk").email.value = a.dataset.email; $("form-masuk").sandi.focus(); }
  });
  setInterval(() => data && gambar(), 30000); // hitung mundur SLA

  try {
    if (TANPA_API) throw new Error("portal dibuka langsung dari berkas");
    if (!window.supabase || !window.KONFIG) throw new Error("pustaka Supabase atau config.js tidak termuat");
    sb = supabase.createClient(KONFIG.url, KONFIG.anonKey);
    const r = await fetch(`${KONFIG.url}/auth/v1/health`, { headers: { apikey: KONFIG.anonKey }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`layanan Auth menjawab ${r.status}`);
  } catch (e) {
    mode = "contoh";
    $("banner").hidden = false;
    $("banner").textContent = `Mode data contoh: Supabase tidak terhubung (${e.message}). Jalankan "npx supabase@3.0.0 start" dan "docker compose -p konsep-12 up -d" di folder 12-supabase-mitra, lalu buka http://localhost:18120.`;
    $("sumber").textContent = "Data contoh bawaan";
    // pratinjau: satu penanda di header, status koneksi disembunyikan
    document.querySelector("[data-pratinjau]").hidden = !PRATINJAU;
    $("sumber").hidden = PRATINJAU;
    return masukPortal(null);
  }

  $("form-masuk").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, g = $("galat-masuk");
    g.hidden = true;
    if (!f.email.value || !f.sandi.value) { g.textContent = "Isi email dan sandi."; g.hidden = false; return; }
    const { data: d, error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.sandi.value });
    if (error) { g.textContent = "Email atau sandi salah. Periksa lagi, atau minta admin pabrik mengatur ulang sandi."; g.hidden = false; return; }
    masukPortal(d.session);
  });
  $("keluar").addEventListener("click", async () => {
    if (kanal) await sb.removeChannel(kanal);
    await sb.auth.signOut();
    tampilMasuk();
  });
  const { data: { session } } = await sb.auth.getSession();
  session ? masukPortal(session) : tampilMasuk();
}

// ---------- data contoh ----------
function contoh() {
  const m = (menit) => new Date(Date.now() - menit * 6e4).toISOString();
  const b = (menitDibuat, jamSla) => new Date(Date.now() - menitDibuat * 6e4 + jamSla * 36e5).toISOString();
  const unit = (serial, model) => ({ serial, model, kota: "Semarang", pelanggan_ref: "PLG-" + serial.slice(-4) });
  const terbuka = [
    { id: 1, nomor: "TK-261105-4821", keluhan: "AC tidak dingin, unit luar berbunyi keras", prioritas: "tinggi", status: "baru", dibuat_pada: m(215), batas_tanggap: b(215, 4), unit: unit("AC1-SMG-00012", "AC split 1 PK") },
    { id: 2, nomor: "TK-261105-5170", keluhan: "Kulkas bagian bawah tidak dingin", prioritas: "tinggi", status: "baru", dibuat_pada: m(170), batas_tanggap: b(170, 4), unit: unit("KL2P-SMG-00007", "Kulkas 2 pintu") },
    { id: 3, nomor: "TK-261105-6034", keluhan: "Layar TV bergaris setelah menyala 10 menit", prioritas: "sedang", status: "baru", dibuat_pada: m(95), batas_tanggap: b(95, 8), unit: unit("TV43-SMG-00019", "TV LED 43 inci") },
    { id: 4, nomor: "TK-261104-2290", keluhan: "Pintu kulkas tidak menutup rapat", prioritas: "sedang", status: "baru", dibuat_pada: m(520), batas_tanggap: b(520, 8), unit: unit("KL2P-SMG-00004", "Kulkas 2 pintu") },
    { id: 5, nomor: "TK-261105-7712", keluhan: "Remote TV tidak berfungsi walau baterai baru", prioritas: "rendah", status: "baru", dibuat_pada: m(30), batas_tanggap: b(30, 24), unit: unit("TV43-SMG-00022", "TV LED 43 inci") },
    { id: 6, nomor: "TK-261104-1187", keluhan: "AC meneteskan air dari unit dalam", prioritas: "sedang", status: "dijadwalkan", dibuat_pada: m(1300), batas_tanggap: b(1300, 8), ditanggapi_pada: m(1240), jadwal_kunjungan: new Date(Date.now() + 18 * 36e5).toISOString(), unit: unit("AC1-SMG-00003", "AC split 1 PK") },
    { id: 7, nomor: "TK-261104-0954", keluhan: "TV mati total setelah listrik padam", prioritas: "tinggi", status: "dikerjakan", dibuat_pada: m(1500), batas_tanggap: b(1500, 4), ditanggapi_pada: m(1460), jadwal_kunjungan: m(60), unit: unit("TV43-SMG-00013", "TV LED 43 inci") },
  ];
  const riwayat = [
    ...[3, 9, 21].map((h) => ({ unit_serial: "AC1-SMG-00012", keluhan: h === 3 ? "AC tidak dingin, unit luar berbunyi keras" : "AC meneteskan air dari unit dalam", dibuat_pada: m(h * 1440 * 0.33 + 215), unit: unit("AC1-SMG-00012", "AC split 1 PK") })),
    ...[1, 12].map((h) => ({ unit_serial: "KL2P-SMG-00007", keluhan: "Kulkas bagian bawah tidak dingin", dibuat_pada: m(h * 1440 * 0.12 + 170), unit: unit("KL2P-SMG-00007", "Kulkas 2 pintu") })),
    ...[2, 17].map((h) => ({ unit_serial: "TV43-SMG-00013", keluhan: "TV mati total setelah listrik padam", dibuat_pada: m(h * 1440), unit: unit("TV43-SMG-00013", "TV LED 43 inci") })),
  ].sort((a, b) => b.dibuat_pada.localeCompare(a.dibuat_pada));
  return { terbuka, riwayat, kinerja: { tanggap_saya_menit: 142, tanggap_semua_menit: 171, tepat_sla_saya: 91.4, tepat_sla_semua: 84.2, tiket_saya: 58 } };
}

mulai();
