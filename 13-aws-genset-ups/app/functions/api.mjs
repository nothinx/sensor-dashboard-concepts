// Lambda HTTP (API Gateway HTTP API, payload v2). Satu fungsi, rute dipilih dari routeKey.
// Lokal: dipanggil lewat local/adapter.mjs; di AWS: lihat template.yaml.
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABEL, PERINGKAT, enkodeToken, dekodeToken, GalatMasukan, KODE_CABANG } from "../lib/inti.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

function bilangan(v, nama, min, maks, bawaan) {
  if (v === undefined || v === "") return bawaan;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > maks) throw new GalatMasukan(`Parameter ${nama} harus bilangan bulat ${min} sampai ${maks}.`);
  return n;
}
function kodeCabang(p) {
  const k = String(p?.kode || "").toUpperCase();
  if (!KODE_CABANG.test(k)) throw new GalatMasukan("Kode cabang harus tiga huruf, misalnya SBY.");
  return k;
}
const rapikan = ({ PK, SK, GSI1PK, GSI1SK, ...sisa }) => sisa;

async function semuaStatus() {
  const r = await ddb.send(new QueryCommand({
    TableName: TABEL, IndexName: "GSI1", KeyConditionExpression: "GSI1PK = :p", ExpressionAttributeValues: { ":p": "STATUS" },
  }));
  return r.Items.map(rapikan);
}

const RUTE = {
  async "GET /ringkasan"() {
    const c = await semuaStatus();
    const hitung = (s) => c.filter((x) => x.status === s).length;
    return json(200, {
      total: c.length, kritis: hitung("kritis"), waspada: hitung("waspada"), normal: hitung("normal"),
      plnPadam: c.filter((x) => !x.pln.ada).length,
      gensetJalan: c.filter((x) => x.genset.jalan).length,
      diperbarui: c.reduce((m, x) => (x.diperbarui > m ? x.diperbarui : m), ""),
    });
  },

  // Daftar cabang terurut dari yang paling gawat; halaman lewat LastEvaluatedKey.
  async "GET /cabang"(q) {
    const limit = bilangan(q.limit, "limit", 1, 50, 12);
    if (q.status && !(q.status in PERINGKAT)) throw new GalatMasukan("Status harus kritis, waspada, atau normal.");
    const r = await ddb.send(new QueryCommand({
      TableName: TABEL, IndexName: "GSI1", Limit: limit, ExclusiveStartKey: dekodeToken(q.next),
      KeyConditionExpression: q.status ? "GSI1PK = :p AND begins_with(GSI1SK, :s)" : "GSI1PK = :p",
      ExpressionAttributeValues: q.status ? { ":p": "STATUS", ":s": `${PERINGKAT[q.status]}#` } : { ":p": "STATUS" },
    }));
    return json(200, { data: r.Items.map(rapikan), next: enkodeToken(r.LastEvaluatedKey) });
  },

  async "GET /cabang/{kode}"(q, p) {
    const kode = kodeCabang(p);
    const r = await ddb.send(new GetCommand({ TableName: TABEL, Key: { PK: `CABANG#${kode}`, SK: "STATUS" } }));
    return r.Item ? json(200, rapikan(r.Item)) : json(404, { galat: `Cabang ${kode} tidak terdaftar.` });
  },

  async "GET /cabang/{kode}/riwayat"(q, p) {
    const kode = kodeCabang(p);
    const jam = bilangan(q.jam, "jam", 1, 168, 24);
    const dari = new Date(Date.now() - jam * 36e5).toISOString();
    const data = [];
    let next;
    do { // ponytail: dibaca habis per halaman 1 MB; tambahkan agregasi bila rentang > 7 hari dibutuhkan
      const r = await ddb.send(new QueryCommand({
        TableName: TABEL, ExclusiveStartKey: next,
        KeyConditionExpression: "PK = :p AND SK BETWEEN :a AND :b",
        ExpressionAttributeValues: { ":p": `CABANG#${kode}`, ":a": `BACA#${dari}`, ":b": "BACA#￿" },
      }));
      data.push(...r.Items.map(({ PK, SK, kedaluwarsa, ...x }) => x));
      next = r.LastEvaluatedKey;
    } while (next);
    return json(200, { kode, jam, data });
  },

  // Kejadian PLN padam semua cabang, terbaru dulu.
  async "GET /padam"(q) {
    const limit = bilangan(q.limit, "limit", 1, 50, 10);
    const r = await ddb.send(new QueryCommand({
      TableName: TABEL, IndexName: "GSI1", Limit: limit, ScanIndexForward: false, ExclusiveStartKey: dekodeToken(q.next),
      KeyConditionExpression: "GSI1PK = :p", ExpressionAttributeValues: { ":p": "PADAM" },
    }));
    return json(200, { data: r.Items.map(rapikan), next: enkodeToken(r.LastEvaluatedKey) });
  },
};

export async function handler(event) {
  const fn = RUTE[event.routeKey];
  if (!fn) return json(404, { galat: "Rute tidak dikenal." });
  try {
    return await fn(event.queryStringParameters || {}, event.pathParameters || {});
  } catch (e) {
    if (e instanceof GalatMasukan) return json(400, { galat: e.message });
    console.error(e);
    return json(500, { galat: "Galat server. Coba lagi sebentar; bila berulang, periksa log fungsi." });
  }
}
