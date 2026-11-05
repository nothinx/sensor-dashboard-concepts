// Inti bersama Lambda & alat lokal: klien DynamoDB (emulator atau cloud dipilih lewat env),
// aturan status cabang, dan kodek token halaman (LastEvaluatedKey <-> string aman URL).
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const TABEL = process.env.TABLE_NAME || "GensetUps";

// DYNAMODB_ENDPOINT terisi = DynamoDB Local; kosong = DynamoDB di akun AWS (kredensial dari peran Lambda)
export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-3",
    ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
  }),
  { marshallOptions: { removeUndefinedValues: true } },
);

// Ambang (lihat docs/DAFTAR-TITIK.md). Urutan peringkat dipakai sebagai awalan GSI1SK supaya
// daftar cabang otomatis terurut dari yang paling gawat.
export const PERINGKAT = { kritis: 0, waspada: 1, normal: 2 };
export const AMBANG = {
  bbmKritis: 20, bbmWaspada: 40,           // % tangki
  bateraiKritis: 30, bateraiWaspada: 60,   // % UPS
  bebanUpsWaspada: 80,                     // % kapasitas UPS
  teganganMin: 207, teganganMaks: 253,     // V fasa-netral (230 V ±10 %)
  frekMin: 49, frekMaks: 51,               // Hz
};

// Mengembalikan { status, alasan[] } dari satu pesan telemetri.
export function nilaiStatus(t) {
  const A = AMBANG, kritis = [], waspada = [];
  const padam = !t.pln.ada, g = t.genset, u = t.ups;
  if (padam && !g.jalan) kritis.push("PLN padam, genset tidak menyala");
  if (g.bbm < A.bbmKritis) kritis.push(`Solar ${g.bbm} %`);
  else if (g.bbm < A.bbmWaspada) waspada.push(`Solar ${g.bbm} %`);
  if (u.baterai < A.bateraiKritis) kritis.push(`Baterai UPS ${u.baterai} %`);
  else if (u.baterai < A.bateraiWaspada) waspada.push(`Baterai UPS ${u.baterai} %`);
  if (g.jalan && (g.tegangan < A.teganganMin || g.tegangan > A.teganganMaks)) kritis.push(`Tegangan genset ${g.tegangan} V`);
  if (g.jalan && (g.frekuensi < A.frekMin || g.frekuensi > A.frekMaks)) kritis.push(`Frekuensi genset ${g.frekuensi} Hz`);
  if (u.beban > A.bebanUpsWaspada) waspada.push(`Beban UPS ${u.beban} %`);
  if (padam && g.jalan) waspada.push("PLN padam, beban di genset");
  if (kritis.length) return { status: "kritis", alasan: kritis };
  if (waspada.length) return { status: "waspada", alasan: waspada };
  return { status: "normal", alasan: [] };
}

export const enkodeToken = (k) => (k ? Buffer.from(JSON.stringify(k)).toString("base64url") : null);
export function dekodeToken(s) {
  if (!s) return undefined;
  try {
    const k = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (k && typeof k === "object" && !Array.isArray(k)) return k;
  } catch { /* jatuh ke galat di bawah */ }
  throw new GalatMasukan("Token halaman tidak valid. Muat ulang daftar dari awal.");
}

export class GalatMasukan extends Error {}

export const KODE_CABANG = /^[A-Z]{3}$/;
