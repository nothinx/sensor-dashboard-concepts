// Adaptor HTTP lokal pengganti API Gateway: ubah permintaan HTTP menjadi event HTTP API v2,
// panggil handler Lambda yang sama dengan di AWS, lalu kirim balik jawabannya.
import { createServer } from "node:http";
import { handler } from "../functions/api.mjs";

const RUTE = [
  ["GET /ringkasan", /^\/ringkasan$/],
  ["GET /cabang", /^\/cabang$/],
  ["GET /cabang/{kode}", /^\/cabang\/([^/]+)$/],
  ["GET /cabang/{kode}/riwayat", /^\/cabang\/([^/]+)\/riwayat$/],
  ["GET /padam", /^\/padam$/],
];

createServer(async (req, res) => {
  const url = new URL(req.url, "http://lokal");
  if (url.pathname === "/kesehatan") return res.end("ok");
  let routeKey = "TIDAK_DIKENAL", pathParameters;
  for (const [key, re] of RUTE) {
    const m = re.exec(url.pathname);
    if (m && key.startsWith(req.method + " ")) { routeKey = key; if (m[1]) pathParameters = { kode: decodeURIComponent(m[1]) }; break; }
  }
  const r = await handler({
    version: "2.0", routeKey, rawPath: url.pathname, pathParameters,
    queryStringParameters: Object.fromEntries(url.searchParams),
    requestContext: { http: { method: req.method, path: url.pathname } },
  });
  res.writeHead(r.statusCode, r.headers);
  res.end(r.body);
}).listen(3000, () => console.log("Adaptor API Gateway lokal di :3000"));
