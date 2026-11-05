// Logika status murni (tanpa I/O) supaya bisa diuji: `node status.js`.
export const RANK = { ok: 0, off: 1, warn: 2, crit: 3 };

// Status satu nilai terhadap ambang {w:[min,max], k:[min,max]}; null = sisi itu tidak dibatasi.
export function nilaiStatus(v, a) {
  if (v == null || !a) return "ok";
  const luar = ([lo, hi]) => (lo != null && v < lo) || (hi != null && v > hi);
  if (a.k && luar(a.k)) return "crit";
  if (a.w && luar(a.w)) return "warn";
  return "ok";
}

export const terburuk = (list) => list.reduce((m, s) => (RANK[s] > RANK[m] ? s : m), "ok");

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("status.js")) {
  const { default: assert } = await import("node:assert/strict");
  const rh = { w: [40, 60], k: [35, 65] };
  assert.equal(nilaiStatus(50, rh), "ok");
  assert.equal(nilaiStatus(62, rh), "warn");
  assert.equal(nilaiStatus(34, rh), "crit");
  const dp = { w: [10, null], k: [5, null] };
  assert.equal(nilaiStatus(12, dp), "ok");
  assert.equal(nilaiStatus(8, dp), "warn");
  assert.equal(nilaiStatus(4, dp), "crit");
  assert.equal(nilaiStatus(38, { w: [-35, 35], k: [-50, 50] }), "warn");
  assert.equal(terburuk(["ok", "off", "warn"]), "warn");
  assert.equal(terburuk(["ok", "off"]), "off");
  console.log("status.js: semua cek lulus");
}
