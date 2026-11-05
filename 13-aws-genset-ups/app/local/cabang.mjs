// Daftar cabang contoh (bukan data asli klien) + pendaftaran tabel untuk DynamoDB Local.
// Di AWS, tabel dibuat oleh template.yaml dan cabang didaftarkan lewat proses onboarding.
import { CreateTableCommand, DeleteTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABEL } from "../lib/inti.mjs";

export const CABANG = [
  ["MDN", "Medan"], ["PLM", "Palembang"], ["JKT", "Jakarta"], ["BKS", "Bekasi"], ["BDG", "Bandung"], ["SMG", "Semarang"],
  ["YOG", "Yogyakarta"], ["SBY", "Surabaya"], ["MLG", "Malang"], ["DPS", "Denpasar"], ["BPN", "Balikpapan"], ["MKS", "Makassar"],
].map(([kode, kota], i) => ({ kode, kota, nama: `Cabang ${kota}`, gensetKva: [100, 150, 200][i % 3], upsKva: [20, 30, 40][i % 3] }));

// ponytail: di emulator tabel selalu dibuat ulang agar keadaan simulator dan isi tabel sejalan setelah restart;
// simpan keadaan simulator di tabel bila data emulator perlu bertahan.
export async function siapkanTabel() {
  if (!process.env.DYNAMODB_ENDPOINT) throw new Error("Simulator hanya untuk emulator: isi DYNAMODB_ENDPOINT.");
  try {
    await ddb.send(new DescribeTableCommand({ TableName: TABEL }));
    await ddb.send(new DeleteTableCommand({ TableName: TABEL }));
  } catch (e) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }
  await ddb.send(new CreateTableCommand({
    TableName: TABEL, BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: ["PK", "SK", "GSI1PK", "GSI1SK"].map((n) => ({ AttributeName: n, AttributeType: "S" })),
    KeySchema: [{ AttributeName: "PK", KeyType: "HASH" }, { AttributeName: "SK", KeyType: "RANGE" }],
    GlobalSecondaryIndexes: [{
      IndexName: "GSI1", Projection: { ProjectionType: "ALL" },
      KeySchema: [{ AttributeName: "GSI1PK", KeyType: "HASH" }, { AttributeName: "GSI1SK", KeyType: "RANGE" }],
    }],
  }));
  await ddb.send(new UpdateTimeToLiveCommand({ TableName: TABEL, TimeToLiveSpecification: { Enabled: true, AttributeName: "kedaluwarsa" } }))
    .catch((e) => console.warn("TTL tidak diaktifkan di emulator:", e.message));
  for (const c of CABANG) {
    await ddb.send(new PutCommand({
      TableName: TABEL, ConditionExpression: "attribute_not_exists(PK)",
      Item: {
        PK: `CABANG#${c.kode}`, SK: "STATUS", GSI1PK: "STATUS", GSI1SK: `2#${c.kode}`, ...c,
        status: "normal", alasan: [], pln: { ada: true, padamSejak: null },
        genset: { jalan: false, bbm: 100, jamJalan: 0, tegangan: 0, frekuensi: 0 }, ups: { baterai: 100, runtime: 25, beban: 50 },
      },
    }));
  }
  return true;
}
