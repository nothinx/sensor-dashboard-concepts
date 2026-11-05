// Aplikasi Teknisi Lapangan. Lewat Firebase Hosting: SDK modular Firebase 10.14.1 dari CDN, Auth + Firestore,
// listener onSnapshot real-time, cache offline IndexedDB. Dibuka sebagai file: data contoh bawaan, aksi berjalan lokal.
"use strict";

const V_SDK = "10.14.1";
const K = window.KONFIGURASI || {};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PRIO = { tinggi: ["crit", "Prioritas tinggi"], sedang: ["warn", "Prioritas sedang"] };

let fb = null;            // modul Firebase setelah dimuat
let saya = null;          // { uid, nama }
let tugas = [], mesin = {}, tab = "baru", pilih = null, tertunda = false, daring = navigator.onLine;

const pukul = (d) => (d ? hhmm(d) : "-");
function sejak(d) {
  const m = Math.max(0, Math.round((Date.now() - d) / 60000));
  return m < 60 ? `${m} mnt lalu` : `${Math.floor(m / 60)} jam ${m % 60} mnt lalu`;
}
const hariIni = (d) => d && d.toDateString() === new Date().toDateString();

// ---------- render ----------
function renderSemua() {
  const baru = tugas.filter((t) => t.status === "baru");
  const kerja = tugas.filter((t) => t.status === "dikerjakan");
  const selesai = tugas.filter((t) => t.status === "selesai" && hariIni(t.selesaiPada));
  const N = { baru, dikerjakan: kerja, selesai };
  for (const k in N) $(`n-${k}`).textContent = N[k].length;

  const tinggi = baru.filter((t) => t.prioritas === "tinggi");
  const t0 = tinggi[0] || baru[0];
  $("temuan").innerHTML = baru.length
    ? `<b>${baru.length} tugas baru${tinggi.length ? `, ${tinggi.length} prioritas tinggi` : ""}.</b> Terlama: ${esc(t0.mesinNama)}, ${esc(t0.lokasi)}.`
    : kerja.length ? `<b>Tidak ada tugas baru.</b> ${kerja.length} tugas sedang dikerjakan.` : "<b>Semua tugas hari ini sudah selesai.</b>";

  renderAktif(kerja.find((t) => t.diambilOleh?.uid === saya?.uid));

  const isi = N[tab];
  // desktop: panel kanan langsung berisi tugas teratas; HP tetap mulai dari daftar
  if (!pilih && isi.length && matchMedia("(min-width: 960px)").matches) pilih = isi[0].id;
  $("daftar").innerHTML = isi.length ? isi.map(itemTugas).join("") : `<li class="kosong">${
    tab === "baru" ? "Tidak ada tugas baru. Tugas muncul otomatis saat sensor mesin melewati ambang." :
    tab === "dikerjakan" ? "Belum ada tugas yang sedang dikerjakan." : "Belum ada tugas selesai hari ini."}</li>`;
  document.querySelectorAll(".tab button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  if (pilih) renderDetail();
}

function itemTugas(t) {
  const [k, teks] = PRIO[t.prioritas] || PRIO.sedang;
  const info = t.status === "baru" ? `dibuat ${sejak(t.dibuat)}` :
    t.status === "dikerjakan" ? `diambil ${esc(t.diambilOleh?.nama)}, pukul ${pukul(t.diambilPada)}` : `selesai pukul ${pukul(t.selesaiPada)} oleh ${esc(t.diambilOleh?.nama)}`;
  return `<li><button class="item" type="button" data-id="${t.id}" aria-current="${t.id === pilih}">
    <span class="nama">${esc(t.mesinNama)}</span>
    <span class="lok">${esc(t.lokasi)} · ${esc(t.besaran)}</span>
    <span class="angka"><b>${fmt(t.nilaiPemicu)}</b><span>${esc(t.satuan)}, ambang ${fmt(t.ambang)}</span></span>
    <span class="meta">${t.status === "baru" ? st(k, teks) : ""}<span>${info}</span>${t.tertunda ? `<span class="tertunda">belum tersinkron</span>` : ""}</span>
  </button></li>`;
}

function capWaktu(t) {
  return `<span class="cap"><b>Diambil oleh ${esc(t.diambilOleh?.nama)}</b><span>pukul ${pukul(t.diambilPada)}</span></span>`;
}

async function renderAktif(t) {
  const el = $("aktif");
  if (!t) { el.innerHTML = ""; return; }
  const m = mesin[t.mesinId]?.terakhir;
  el.innerHTML = `<div class="kartu-aktif">
    <span class="label">Sedang kamu kerjakan</span>
    <div><h2>${esc(t.mesinNama)}</h2><p class="muted">${esc(t.lokasi)} · ${esc(t.besaran)}</p></div>
    <div class="nilai"><b>${fmt(m ? m.nilai : t.nilaiPemicu)}</b><span>${esc(t.satuan)} sekarang · ambang ${fmt(t.ambang)}</span></div>
    <div id="trenAktif" data-label="Tren ${esc(t.mesinNama)} 6 jam"><p class="memuat">Memuat tren…</p></div>
    ${capWaktu(t)}
    <button class="btn primary lebar" type="button" data-buka="${t.id}">Tutup tugas ini</button>
  </div>`;
  await gambarTren("trenAktif", t, 6, 160);
}

async function gambarTren(elId, t, jam, h) {
  try {
    const rw = await riwayat(t.mesinId, jam);
    const el = $(elId);
    if (!el) return;
    if (!rw.length) { el.innerHTML = `<p class="kosong">Belum ada bacaan ${jam} jam terakhir.</p>`; return; }
    lineChart(el, {
      x: rw.map((p) => p.ts), series: [{ name: t.besaran, color: "var(--s1)", data: rw.map((p) => p.nilai) }],
      unit: t.satuan, h, dec: 1, bands: [{ y: t.ambang, label: `ambang ${fmt(t.ambang)}`, color: "var(--crit)" }],
      min: Math.floor(Math.min(...rw.map((p) => p.nilai), t.ambang) * 0.95), max: Math.ceil(Math.max(...rw.map((p) => p.nilai), t.ambang) * 1.05),
    });
  } catch (e) {
    const el = $(elId);
    if (el) el.innerHTML = `<p class="kosong">Tren gagal dimuat (${esc(e.message)}). Buka ulang tugas untuk mencoba lagi.</p>`;
  }
}

function renderDetail() {
  const t = tugas.find((x) => x.id === pilih);
  const d = $("detail");
  if (!t) { d.hidden = true; $("utama").classList.remove("lihat-detail"); return; }
  if (d.dataset.id === t.id && d.dataset.status === t.status && d.dataset.tertunda === String(!!t.tertunda)) return; // tidak berubah
  d.dataset.id = t.id; d.dataset.status = t.status; d.dataset.tertunda = String(!!t.tertunda);
  d.hidden = false;
  $("utama").classList.add("lihat-detail");
  const [k, teks] = PRIO[t.prioritas] || PRIO.sedang;
  const milikSaya = t.diambilOleh?.uid === saya?.uid;
  let aksi = "";
  if (t.status === "baru") aksi = `<button class="btn primary lebar" type="button" id="btnAmbil">Mulai kerjakan</button>`;
  else if (t.status === "dikerjakan" && milikSaya) aksi = `<label>Catatan penanganan<textarea id="catatan" maxlength="500" placeholder="Mis. bearing diganti, getaran turun ke 2,1 mm/s"></textarea></label>
    <button class="btn primary lebar" type="button" id="btnSelesai">Selesai</button>`;
  else if (t.status === "dikerjakan") aksi = `<p class="muted">Tugas ini sedang dikerjakan ${esc(t.diambilOleh?.nama)}.</p>`;
  d.innerHTML = `
    <button class="kembali" type="button" id="kembali">Kembali ke daftar</button>
    <div><h2>${esc(t.mesinNama)}</h2><p class="muted">${esc(t.lokasi)}</p></div>
    <div class="row-st">${t.status === "baru" ? st(k, teks) : t.status === "dikerjakan" ? st("warn", "Dikerjakan") : st("ok", "Selesai")}</div>
    ${t.diambilOleh ? capWaktu(t) : ""}
    <dl>
      <dt>Pemicu</dt><dd><span class="num">${fmt(t.nilaiPemicu)} ${esc(t.satuan)}</span> (ambang ${fmt(t.ambang)})</dd>
      <dt>Besaran</dt><dd>${esc(t.besaran)}</dd>
      <dt>Dibuat</dt><dd>pukul ${pukul(t.dibuat)}, ${sejak(t.dibuat)}</dd>
      ${t.selesaiPada ? `<dt>Selesai</dt><dd>pukul ${pukul(t.selesaiPada)}</dd>` : ""}
    </dl>
    ${t.catatan ? `<div class="catatan">${esc(t.catatan)}</div>` : ""}
    <div><h3 style="font-size:15px;margin-bottom:8px">${esc(t.besaran)}, 24 jam</h3><div id="trenDetail" data-label="Tren ${esc(t.mesinNama)} 24 jam"><p class="memuat">Memuat tren…</p></div></div>
    ${aksi}
    <p class="galat" id="galatAksi" role="alert" hidden></p>`;
  gambarTren("trenDetail", t, 24, 200);
  $("kembali").onclick = () => { pilih = null; renderSemua(); renderDetail(); };
  if ($("btnAmbil")) $("btnAmbil").onclick = () => ubah(t, "ambil");
  if ($("btnSelesai")) $("btnSelesai").onclick = () => ubah(t, "selesai", $("catatan").value.trim());
}

function renderSinkron() {
  const el = $("sinkron");
  el.hidden = daring && !tertunda;
  el.textContent = !daring ? "Offline. Perubahan disimpan di HP dan akan disinkronkan saat tersambung." : "Menyinkronkan perubahan…";
}

// ---------- aksi ----------
async function ubah(t, aksi, catatan = "") {
  const galat = $("galatAksi");
  if (aksi === "selesai" && catatan.length < 5) { galat.textContent = "Tulis catatan penanganan minimal 5 karakter sebelum menutup tugas."; galat.hidden = false; return; }
  if (!fb) return ubahLokal(t, aksi, catatan);
  const { updateDoc, doc, serverTimestamp } = fb.fs;
  const perubahan = aksi === "ambil"
    ? { status: "dikerjakan", diambilOleh: { uid: saya.uid, nama: saya.nama }, diambilPada: serverTimestamp() }
    : { status: "selesai", selesaiPada: serverTimestamp(), catatan };
  // tidak di-await: saat offline promise baru selesai setelah tersinkron, layar sudah berubah dari cache lokal
  updateDoc(doc(fb.db, "tugas", t.id), perubahan).catch((e) => {
    galat.textContent = e.code === "permission-denied"
      ? "Perubahan ditolak server: tugas mungkin sudah diambil teknisi lain. Muat ulang daftar."
      : `Perubahan gagal disimpan (${e.message}). Coba lagi.`;
    galat.hidden = false;
  });
}

function ubahLokal(t, aksi, catatan) {
  if (aksi === "ambil") Object.assign(t, { status: "dikerjakan", diambilOleh: { ...saya }, diambilPada: new Date() });
  else Object.assign(t, { status: "selesai", selesaiPada: new Date(), catatan });
  tab = t.status;
  renderSemua();
}

// ---------- sumber data ----------
async function riwayat(mesinId, jam) {
  if (!fb) return contohRiwayat(mesinId, jam);
  const { collection, query, where, orderBy, getDocs, Timestamp } = fb.fs;
  const q = query(collection(fb.db, "bacaan"), where("mesinId", "==", mesinId), where("ts", ">=", Timestamp.fromMillis(Date.now() - jam * 36e5)), orderBy("ts"));
  return (await getDocs(q)).docs.map((d) => ({ ts: d.data().ts.toDate(), nilai: d.data().nilai }));
}

async function mulaiFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${V_SDK}`;
  const [app, fs, au] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-firestore.js`), import(`${base}/firebase-auth.js`)]);
  const fbApp = app.initializeApp({ projectId: K.projectId, apiKey: K.apiKey, authDomain: K.authDomain || undefined, appId: K.appId || undefined });
  const db = fs.initializeFirestore(fbApp, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  const auth = au.getAuth(fbApp);
  if (K.emulator) {
    fs.connectFirestoreEmulator(db, location.hostname, K.port.firestore);
    au.connectAuthEmulator(auth, `http://${location.hostname}:${K.port.auth}`, { disableWarnings: true });
  }
  fb = { fs, au, db, auth };
  let lepas = [];
  au.onAuthStateChanged(auth, async (u) => {
    lepas.forEach((f) => f());
    lepas = [];
    if (!u) {
      // ?demo: langsung masuk dengan akun demo pertama (hanya emulator; untuk presentasi dan uji layar)
      if (K.emulator && K.akunDemo?.length && new URLSearchParams(location.search).has("demo")) return au.signInWithEmailAndPassword(auth, K.akunDemo[0].email, K.sandiDemo);
      return tampilMasuk();
    }
    saya = { uid: u.uid, nama: u.displayName || u.email };
    tampilUtama();
    lepas.push(fs.onSnapshot(fs.collection(db, "mesin"), (s) => {
      s.docs.forEach((d) => { const m = d.data(); mesin[d.id] = { ...m, terakhir: m.terakhir && { nilai: m.terakhir.nilai, ts: m.terakhir.ts.toDate() } }; });
    }));
    const q = fs.query(fs.collection(db, "tugas"), fs.orderBy("dibuat", "desc"), fs.limit(60));
    lepas.push(fs.onSnapshot(q, { includeMetadataChanges: true }, (s) => {
      const tgl = (v) => (v && v.toDate ? v.toDate() : v ? new Date() : null); // serverTimestamp tertunda -> waktu lokal
      tugas = s.docs.map((d) => {
        const x = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, ...x, dibuat: tgl(x.dibuat), diambilPada: tgl(x.diambilPada), selesaiPada: tgl(x.selesaiPada), tertunda: d.metadata.hasPendingWrites };
      });
      tertunda = s.metadata.hasPendingWrites;
      renderSinkron();
      renderSemua();
    }, (e) => tampilBanner(`Daftar tugas gagal dimuat (${esc(e.message)}). Periksa koneksi lalu muat ulang halaman.`)));
  });
}

function tampilMasuk() {
  $("utama").hidden = true; $("akun").hidden = true; $("masuk").hidden = false;
  $("akunDemo").innerHTML = (K.akunDemo || []).map((a) => `<button class="btn lebar" type="button" data-email="${esc(a.email)}">Masuk sebagai ${esc(a.nama)}</button>`).join("")
    || `<p class="muted">[REAL DATA: formulir masuk akun perusahaan]</p>`;
}
function tampilUtama() {
  $("masuk").hidden = true; $("utama").hidden = false;
  $("akun").hidden = false; $("akun").textContent = "Keluar";
  $("akun").setAttribute("aria-label", `Keluar dari akun ${saya.nama}`);
  $("siapa").textContent = `Masuk sebagai ${saya.nama}`;
}
function tampilBanner(html) { const b = $("banner"); b.innerHTML = html; b.hidden = false; }

// ---------- data contoh ----------
const MESIN_CONTOH = {
  "P-01": ["Pompa air pendingin P-01", "Gedung utilitas", "Getaran", "mm/s", 2.4, 4.5],
  "OV-L2": ["Oven reflow Line 2, zona 6", "Ruang SMT", "Suhu", "°C", 245, 250],
  "K-02": ["Kompresor udara K-02", "Gedung utilitas", "Suhu keluaran", "°C", 82, 95],
  "MDP": ["Panel listrik utama", "Ruang panel", "Suhu busbar", "°C", 52, 70],
  "CH-01": ["Chiller 1", "Gedung utilitas", "Tekanan kondensor", "bar", 12.5, 16],
};
function contohRiwayat(id, jam) {
  const [, , , , normal, ambang] = MESIN_CONTOH[id];
  const n = jam * 6, naik = { "P-01": 6, "OV-L2": 8, "K-02": 75 }[id];
  return Array.from({ length: n }, (_, i) => {
    const mnt = (n - 1 - i) * 10;
    let v = normal * (1 + Math.sin(i / 9) * 0.03) + Math.sin(i * 1.7) * normal * 0.012;
    if (naik && mnt <= naik * 6) v += (ambang - normal) * (1.25 * (1 - mnt / (naik * 6)) + 0.05);
    return { ts: new Date(Date.now() - mnt * 60000), nilai: +v.toFixed(1) };
  });
}
function modeContoh() {
  saya = { uid: "teknisi-1", nama: "Teknisi shift 1" };
  const mnt = (m) => new Date(Date.now() - m * 60000);
  const buat = (id, mesinId, nilaiPemicu, prioritas, status, dibuat, extra = {}) => {
    const [mesinNama, lokasi, besaran, satuan, , ambang] = MESIN_CONTOH[mesinId];
    return { id, mesinId, mesinNama, lokasi, besaran, satuan, ambang, nilaiPemicu, prioritas, status, dibuat: mnt(dibuat),
      diambilOleh: null, diambilPada: null, selesaiPada: null, catatan: "", ...extra };
  };
  const t1 = { uid: "teknisi-1", nama: "Teknisi shift 1" }, t2 = { uid: "teknisi-2", nama: "Teknisi shift 2" };
  tugas = [
    buat("a", "P-01", 5.4, "tinggi", "baru", 4),
    buat("b", "OV-L2", 252.4, "sedang", "baru", 9),
    buat("c", "K-02", 97.4, "sedang", "dikerjakan", 75, { diambilOleh: t1, diambilPada: mnt(62) }),
    buat("d", "MDP", 73.1, "sedang", "selesai", 300, { diambilOleh: t1, diambilPada: mnt(290), selesaiPada: mnt(245), catatan: "Baut busbar fasa R dikencangkan; suhu turun ke 54 °C." }),
    buat("e", "CH-01", 16.8, "sedang", "selesai", 420, { diambilOleh: t2, diambilPada: mnt(400), selesaiPada: mnt(350), catatan: "Kondensor dibersihkan." }),
  ];
  mesin = { "K-02": { terakhir: { nilai: 96.1, ts: new Date() } } };
  tampilUtama();
  tampilBanner(`Mode data contoh: aplikasi dibuka langsung dari berkas, jadi tidak terhubung ke Firebase. Jalankan <code>docker compose -p konsep-11 up -d</code> lalu buka <code>http://localhost:18110</code>.`);
  renderSemua();
}

// ---------- event ----------
document.querySelector(".tab").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) { tab = b.dataset.tab; renderSemua(); }
});
document.addEventListener("click", (e) => {
  const it = e.target.closest(".item, [data-buka]");
  if (it) { pilih = it.dataset.id || it.dataset.buka; renderSemua(); renderDetail(); $("detail").scrollIntoView({ block: "nearest" }); }
  const ak = e.target.closest("#akunDemo button");
  if (ak && fb) fb.au.signInWithEmailAndPassword(fb.auth, ak.dataset.email, K.sandiDemo).catch((err) => {
    $("galatMasuk").textContent = `Gagal masuk (${err.code}). Pastikan simulator sudah selesai menyiapkan akun, lalu coba lagi.`;
    $("galatMasuk").hidden = false;
  });
});
$("akun").addEventListener("click", () => { if (fb) fb.au.signOut(fb.auth); else location.reload(); });
addEventListener("online", () => { daring = true; renderSinkron(); });
addEventListener("offline", () => { daring = false; renderSinkron(); });

if (TANPA_API || !K.projectId) modeContoh();
else {
  mulaiFirebase().catch((e) => { tampilBanner(`Firebase tidak bisa dimuat (${esc(e.message)}). Menampilkan data contoh.`); modeContoh(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
