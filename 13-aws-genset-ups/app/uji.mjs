// Uji cepat tanpa database: aturan status dan kodek token halaman. Jalankan: node uji.mjs
import assert from "node:assert/strict";
import { nilaiStatus, enkodeToken, dekodeToken, GalatMasukan } from "./lib/inti.mjs";

const dasar = { pln: { ada: true }, genset: { jalan: false, bbm: 90, tegangan: 0, frekuensi: 0 }, ups: { baterai: 100, beban: 50 } };
const ubah = (f) => { const t = structuredClone(dasar); f(t); return t; };

assert.equal(nilaiStatus(dasar).status, "normal");
assert.equal(nilaiStatus(ubah((t) => { t.pln.ada = false; })).status, "kritis", "padam tanpa genset = kritis");
assert.equal(nilaiStatus(ubah((t) => { t.pln.ada = false; t.genset = { jalan: true, bbm: 90, tegangan: 230, frekuensi: 50 }; })).status, "waspada");
assert.equal(nilaiStatus(ubah((t) => { t.genset.bbm = 17; })).status, "kritis");
assert.equal(nilaiStatus(ubah((t) => { t.genset.bbm = 35; })).status, "waspada");
assert.equal(nilaiStatus(ubah((t) => { t.ups.beban = 86; })).status, "waspada");
assert.equal(nilaiStatus(ubah((t) => { t.pln.ada = false; t.genset = { jalan: true, bbm: 90, tegangan: 200, frekuensi: 50 }; })).status, "kritis");

const k = { PK: "CABANG#SBY", SK: "STATUS", GSI1PK: "STATUS", GSI1SK: "2#SBY" };
assert.deepEqual(dekodeToken(enkodeToken(k)), k);
assert.equal(dekodeToken(""), undefined);
assert.throws(() => dekodeToken("bukan-token"), GalatMasukan);
console.log("uji lulus");
