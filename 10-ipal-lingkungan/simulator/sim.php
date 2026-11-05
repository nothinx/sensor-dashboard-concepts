<?php
// Simulator sensor online IPAL + pengirim webhook.
// - Start pertama: isi 24 jam terakhir tiap 2 menit (backfill), termasuk satu lonjakan COD di outlet.
// - Lalu tiap TICK_DETIK: tulis satu pembacaan per titik x parameter, perbarui tabel kejadian.
// - Tiap WEBHOOK_DETIK: kirim pembacaan outlet (S4) sejak pengiriman sukses terakhir ke WEBHOOK_URL.
declare(strict_types=1);

require __DIR__ . '/../api/src/db.php';
date_default_timezone_set('Asia/Jakarta');

const TITIK = ['S1', 'S2', 'S3', 'S4'];
const PARAM = ['ph', 'cod', 'tss', 'nh3n', 'debit', 'suhu'];
// nilai dasar per titik: proses mengolah COD, TSS, amonia secara bertahap
const DASAR = [
    'S1' => ['ph' => 7.6, 'cod' => 900, 'tss' => 450, 'nh3n' => 35, 'debit' => 18, 'suhu' => 31.5],
    'S2' => ['ph' => 7.1, 'cod' => 420, 'tss' => 90,  'nh3n' => 30, 'debit' => 18, 'suhu' => 31.0],
    'S3' => ['ph' => 7.3, 'cod' => 120, 'tss' => 60,  'nh3n' => 8,  'debit' => 17.5, 'suhu' => 30.0],
    'S4' => ['ph' => 7.2, 'cod' => 55,  'tss' => 30,  'nh3n' => 2.5, 'debit' => 17.2, 'suhu' => 29.5],
];
$TICK = (int) (getenv('TICK_DETIK') ?: 30);
$WEBHOOK = (int) (getenv('WEBHOOK_DETIK') ?: 60);

function tunggu_db(): void
{
    for ($i = 0; $i < 60; $i++) {
        try { db()->query('select 1 from titik limit 1'); return; } catch (Throwable $e) { sleep(2); }
    }
    fwrite(STDERR, "Basis data tidak siap setelah 120 detik\n");
    exit(1);
}

function derau(float $amp): float { return (mt_rand() / mt_getrandmax() - 0.5) * 2 * $amp; }

/** Nilai satu parameter. $anchor = waktu backfill dibuat, sehingga skenario tetap sama walau simulator restart. */
function nilai(string $t, string $p, int $ts, int $anchor): float
{
    $b = DASAR[$t][$p];
    $jam = (int) date('G', $ts) + (int) date('i', $ts) / 60;
    $produksi = ($jam >= 7 && $jam <= 22) ? 1 : 0.55;           // beban limbah ikut jam produksi
    $harian = sin(($jam - 8) / 24 * 2 * M_PI);
    $m = ($ts - $anchor) / 60;                                   // menit relatif terhadap anchor
    $v = match ($p) {
        'ph' => $b + 0.15 * $harian + derau(0.08),
        'debit' => $b * $produksi + derau(0.8),
        'suhu' => $b + 1.2 * $harian + derau(0.2),
        default => $b * (0.85 + 0.25 * $produksi) + derau($b * 0.06),
    };
    // Skenario 1: aerasi terganggu 3 jam 20 menit sampai 2 jam 30 menit sebelum anchor, COD S3/S4 melonjak
    if ($p === 'cod' && in_array($t, ['S3', 'S4'], true) && $m > -200 && $m < -150) {
        $v += ($t === 'S4' ? 75 : 140) * sin(($m + 200) / 50 * M_PI);
    }
    // Skenario 2: amonia outlet naik mulai 50 menit sebelum anchor, bertahan sampai 90 menit sesudahnya
    if ($p === 'nh3n' && $t === 'S4' && $m > -50 && $m < 90) {
        $v += 3.4 * min(1, ($m + 50) / 30) * min(1, (90 - $m) / 20);
    }
    return round(max(0, $v), 3);
}

function tulis(int $ts, int $anchor): void
{
    $w = date('Y-m-d H:i:s', $ts);
    $baris = [];
    $isi = [];
    foreach (TITIK as $t) foreach (PARAM as $p) {
        $baris[] = '(?,?,?,?)';
        array_push($isi, $t, $p, $w, nilai($t, $p, $ts, $anchor));
    }
    db()->prepare('insert ignore into pembacaan (titik, parameter, waktu, nilai) values ' . implode(',', $baris))->execute($isi);
    perbarui_kejadian($w);
}

/** Buka/tutup kejadian untuk titik wajib baku mutu berdasarkan pembacaan pada waktu $w. */
function perbarui_kejadian(string $w): void
{
    $rows = db()->prepare(
        'select b.titik, b.parameter, b.nilai, p.bm_min, p.bm_maks,
                (select id from kejadian k where k.titik = b.titik and k.parameter = b.parameter and k.selesai is null limit 1) as aktif
         from pembacaan b join parameter p on p.kode = b.parameter join titik t on t.kode = b.titik
         where t.wajib_baku_mutu and b.waktu = ? and (p.bm_min is not null or p.bm_maks is not null)');
    $rows->execute([$w]);
    foreach ($rows->fetchAll() as $r) {
        $v = (float) $r['nilai'];
        $lewat = ($r['bm_maks'] !== null && $v > (float) $r['bm_maks']) || ($r['bm_min'] !== null && $v < (float) $r['bm_min']);
        $batas = $r['bm_maks'] !== null && $v > (float) $r['bm_maks'] ? $r['bm_maks'] : ($r['bm_min'] ?? $r['bm_maks']);
        if ($lewat && !$r['aktif']) {
            db()->prepare('insert into kejadian (titik, parameter, mulai, puncak, batas) values (?,?,?,?,?)')
                ->execute([$r['titik'], $r['parameter'], $w, $v, $batas]);
        } elseif ($lewat) {
            db()->prepare('update kejadian set puncak = greatest(puncak, ?) where id = ?')->execute([$v, $r['aktif']]);
        } elseif ($r['aktif']) {
            db()->prepare('update kejadian set selesai = ? where id = ?')->execute([$w, $r['aktif']]);
        }
    }
}

/** Kirim pembacaan S4 sejak pengiriman sukses terakhir. Gagal = dicatat, data ikut terkirim di percobaan berikutnya. */
function kirim_webhook(): void
{
    $url = (string) getenv('WEBHOOK_URL');
    if ($url === '') return;
    $dari = db()->query("select coalesce(max(sampai), now() - interval 10 minute) from webhook_log where hasil = 'terkirim'")->fetchColumn();
    $sampai = date('Y-m-d H:i:s');
    $st = db()->prepare("select parameter, waktu, nilai from pembacaan where titik = 'S4' and waktu > ? and waktu <= ? order by waktu");
    $st->execute([$dari, $sampai]);
    $data = array_map(fn ($x) => ['parameter' => $x['parameter'], 'waktu' => date('c', strtotime($x['waktu'])), 'nilai' => (float) $x['nilai']], $st->fetchAll());
    // ponytail: format muatan contoh; ganti sesuai spesifikasi penerima. [REAL DATA: spesifikasi sistem pelaporan lingkungan]
    $body = json_encode(['sumber' => 'ipal-konsep-mockup', 'titik' => 'S4', 'dari' => date('c', strtotime($dari)),
        'sampai' => date('c', strtotime($sampai)), 'data' => $data], JSON_UNESCAPED_UNICODE);
    $sig = hash_hmac('sha256', $body, (string) getenv('WEBHOOK_SECRET'));
    $mulai = microtime(true);
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 10, 'ignore_errors' => true,
        'header' => "Content-Type: application/json\r\nX-Signature-256: sha256=$sig\r\nX-Idempotency-Key: " . sha1($dari . $sampai) . "\r\n",
        'content' => $body]]);
    $jawab = @file_get_contents($url, false, $ctx);
    $ms = (int) round((microtime(true) - $mulai) * 1000);
    $kode = isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m) ? (int) $m[1] : null;
    $ok = $kode !== null && $kode >= 200 && $kode < 300;
    $galat = $ok ? null : ($kode === null ? 'Penerima tidak dapat dihubungi' : "Penerima menjawab HTTP $kode: " . substr((string) $jawab, 0, 120));
    db()->prepare('insert into webhook_log (waktu, url, dari, sampai, jumlah_data, status_http, durasi_ms, hasil, galat) values (now(),?,?,?,?,?,?,?,?)')
        ->execute([$url, $dari, $sampai, count($data), $kode, $ms, $ok ? 'terkirim' : 'gagal', $galat]);
    echo date('H.i.s') . ' webhook ' . ($ok ? 'terkirim' : 'gagal') . ' (' . count($data) . " data)\n";
}

tunggu_db();
$min = db()->query('select unix_timestamp(min(waktu)) from pembacaan')->fetchColumn();
if (!$min) {
    $anchor = time();
    echo "Backfill 24 jam...\n";
    for ($ts = $anchor - 86400; $ts <= $anchor; $ts += 120) tulis($ts - $ts % 60, $anchor);
} else {
    $anchor = (int) $min + 86400;
}
// retensi: data mentah 90 hari (lihat docs/DATABASE.md)
db()->exec('delete from pembacaan where waktu < now() - interval 90 day');

$terakhirKirim = 0;
while (true) {
    $ts = time();
    tulis($ts, $anchor);
    if ($ts - $terakhirKirim >= $WEBHOOK) { kirim_webhook(); $terakhirKirim = $ts; }
    sleep($TICK);
}
