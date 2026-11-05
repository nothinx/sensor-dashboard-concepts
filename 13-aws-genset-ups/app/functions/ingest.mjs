// Lambda ingest: dipicu AWS IoT Rule `SELECT *, topic() AS topic FROM 'konsep/cabang/+/telemetri'`.
// Memperbarui item STATUS, menyimpan riwayat, dan membuka/menutup kejadian PLN padam.
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABEL, PERINGKAT, nilaiStatus, KODE_CABANG } from "../lib/inti.mjs";

const RETENSI_DETIK = 7 * 86400; // TTL riwayat

function periksa(e) {
  const kode = /^konsep\/cabang\/([A-Z]{3})\/telemetri$/.exec(e.topic || "")?.[1];
  const angka = (v) => typeof v === "number" && Number.isFinite(v);
  if (!kode || !KODE_CABANG.test(kode)) throw new Error(`topic tidak valid: ${e.topic}`);
  if (!e.ts || Number.isNaN(Date.parse(e.ts))) throw new Error("ts tidak valid");
  const g = e.genset || {}, u = e.ups || {};
  if (typeof e.pln?.ada !== "boolean" || typeof g.jalan !== "boolean") throw new Error("pln.ada/genset.jalan wajib boolean");
  for (const v of [g.bbm, g.jamJalan, g.tegangan, g.frekuensi, u.baterai, u.runtime, u.beban]) if (!angka(v)) throw new Error("nilai sensor harus angka");
  return kode;
}

export async function handler(e) {
  const kode = periksa(e);
  const PK = `CABANG#${kode}`;
  const lama = (await ddb.send(new GetCommand({ TableName: TABEL, Key: { PK, SK: "STATUS" } }))).Item;
  if (!lama) throw new Error(`cabang ${kode} belum terdaftar`); // didaftarkan lewat local/buat-tabel.mjs atau proses onboarding

  const { status, alasan } = nilaiStatus(e);
  let padamSejak = lama.pln?.padamSejak ?? null;

  if (!e.pln.ada && lama.pln?.ada !== false) { // PLN baru padam: buka kejadian
    padamSejak = e.ts;
    await ddb.send(new PutCommand({
      TableName: TABEL,
      Item: { PK, SK: `PADAM#${e.ts}`, GSI1PK: "PADAM", GSI1SK: e.ts, kode, nama: lama.nama, mulai: e.ts, selesai: null, gensetMenyala: e.genset.jalan },
    }));
  } else if (e.pln.ada && lama.pln?.ada === false && padamSejak) { // PLN kembali: tutup kejadian
    await ddb.send(new UpdateCommand({
      TableName: TABEL, Key: { PK, SK: `PADAM#${padamSejak}` },
      UpdateExpression: "SET selesai = :t", ExpressionAttributeValues: { ":t": e.ts },
    }));
    padamSejak = null;
  } else if (!e.pln.ada && e.genset.jalan && lama.genset && !lama.genset.jalan && padamSejak) {
    await ddb.send(new UpdateCommand({ // genset akhirnya menyala di tengah padam
      TableName: TABEL, Key: { PK, SK: `PADAM#${padamSejak}` },
      UpdateExpression: "SET gensetMenyala = :y", ExpressionAttributeValues: { ":y": true },
    }));
  }

  await ddb.send(new UpdateCommand({
    TableName: TABEL, Key: { PK, SK: "STATUS" },
    // pesan lama (mis. dikirim ulang IoT) tidak boleh menimpa keadaan yang lebih baru
    ConditionExpression: "attribute_not_exists(diperbarui) OR diperbarui <= :ts",
    UpdateExpression: "SET #st = :st, alasan = :al, pln = :pln, genset = :g, ups = :u, diperbarui = :ts, GSI1SK = :sk",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: {
      ":st": status, ":al": alasan, ":pln": { ada: e.pln.ada, padamSejak }, ":g": e.genset, ":u": e.ups, ":ts": e.ts,
      ":sk": `${PERINGKAT[status]}#${kode}`,
    },
  })).catch((err) => { if (err.name !== "ConditionalCheckFailedException") throw err; });

  if (e.simpanRiwayat !== false) {
    const g = e.genset, u = e.ups;
    await ddb.send(new PutCommand({
      TableName: TABEL,
      Item: {
        PK, SK: `BACA#${e.ts}`, ts: e.ts, status, plnAda: e.pln.ada, gensetJalan: g.jalan,
        bbm: g.bbm, tegangan: g.tegangan, frekuensi: g.frekuensi, baterai: u.baterai, runtime: u.runtime, beban: u.beban,
        kedaluwarsa: Math.floor(Date.parse(e.ts) / 1000) + RETENSI_DETIK,
      },
    }));
  }
  return { kode, status };
}
