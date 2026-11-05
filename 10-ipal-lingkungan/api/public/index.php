<?php
// REST API IPAL (Slim 4 + PDO). Semua rute /api/v1/* wajib header X-API-Key, kecuali /api/v1/sehat.
// Dokumentasi lengkap: docs/API.md dan docs/openapi.yaml.
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Res;
use Psr\Http\Message\ServerRequestInterface as Req;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Exception\HttpException;
use Slim\Factory\AppFactory;

require __DIR__ . '/../../vendor/autoload.php';
require __DIR__ . '/../src/db.php';

date_default_timezone_set('Asia/Jakarta');
$app = AppFactory::create();

function json(Res $res, mixed $data, int $code = 200): Res
{
    $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION));
    return $res->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($code);
}

final class Galat extends Exception
{
    public function __construct(public int $kode, string $pesan) { parent::__construct($pesan); }
}

// ---- validasi input (batas kepercayaan) ----
function pilihan(array $q, string $k, array $boleh, ?string $bawaan = null): string
{
    $v = $q[$k] ?? $bawaan;
    if ($v === null || !in_array($v, $boleh, true)) {
        throw new Galat(400, "Parameter '$k' tidak valid. Pilihan: " . implode(', ', $boleh) . '.');
    }
    return $v;
}
function angka(array $q, string $k, int $min, int $max, int $bawaan): int
{
    if (!isset($q[$k])) return $bawaan;
    if (!ctype_digit((string) $q[$k]) || (int) $q[$k] < $min || (int) $q[$k] > $max) {
        throw new Galat(400, "Parameter '$k' harus bilangan bulat $min sampai $max.");
    }
    return (int) $q[$k];
}

// ---- middleware: kunci API + penanganan galat JSON ----
$app->add(function (Req $req, Handler $h): Res {
    $jalur = $req->getUri()->getPath();
    if ($jalur !== '/api/v1/sehat') {
        $kunci = $req->getHeaderLine('X-API-Key');
        if ($kunci === '' || !hash_equals((string) getenv('API_KEY'), $kunci)) {
            return json(new Slim\Psr7\Response(), ['galat' => 'tidak_diizinkan', 'pesan' => 'Header X-API-Key kosong atau salah.'], 401);
        }
    }
    try {
        return $h->handle($req);
    } catch (Galat $e) {
        return json(new Slim\Psr7\Response(), ['galat' => 'permintaan_salah', 'pesan' => $e->getMessage()], $e->kode);
    } catch (PDOException $e) {
        error_log('[db] ' . $e->getMessage());
        return json(new Slim\Psr7\Response(), ['galat' => 'basis_data', 'pesan' => 'Basis data tidak dapat diakses. Coba lagi beberapa saat.'], 503);
    }
});
$app->addRoutingMiddleware();
$err = $app->addErrorMiddleware(false, true, true);
$err->setDefaultErrorHandler(function (Req $req, Throwable $e) use ($app): Res {
    $kode = $e instanceof HttpException ? $e->getCode() : 500;
    $pesan = $kode === 404 ? 'Rute tidak ditemukan.' : ($kode === 405 ? 'Metode tidak didukung.' : 'Galat server.');
    if ($kode >= 500) error_log((string) $e);
    return json($app->getResponseFactory()->createResponse(), ['galat' => 'http_' . $kode, 'pesan' => $pesan], $kode);
});

const TITIK = ['S1', 'S2', 'S3', 'S4'];
const PARAM = ['ph', 'cod', 'tss', 'nh3n', 'debit', 'suhu'];

// Status nilai terhadap baku mutu: melewati / mendekati (>= 90 % batas atau < 0,3 dari batas pH) / normal
function status(?float $v, ?float $min, ?float $maks): string
{
    if ($v === null || ($min === null && $maks === null)) return 'tanpa_baku_mutu';
    if (($maks !== null && $v > $maks) || ($min !== null && $v < $min)) return 'melewati';
    if ($maks !== null && $min === null && $v >= 0.9 * $maks) return 'mendekati';
    if ($min !== null && $maks !== null && ($v - $min < 0.3 || $maks - $v < 0.3)) return 'mendekati';
    return 'normal';
}

$app->get('/api/v1/sehat', fn (Req $q, Res $r) => json($r, ['status' => 'ok', 'waktu' => date('c')]));

$app->get('/api/v1/parameter', function (Req $q, Res $r) {
    $rows = db()->query('select kode, nama, satuan, bm_min, bm_maks, desimal, keterangan from parameter order by field(kode, "ph","cod","tss","nh3n","debit","suhu")')->fetchAll();
    return json($r, ['data' => array_map('angkakan', $rows)]);
});

$app->get('/api/v1/titik', function (Req $q, Res $r) {
    $param = db()->query('select kode, nama, satuan, bm_min, bm_maks, desimal from parameter')->fetchAll(PDO::FETCH_UNIQUE);
    // nilai terakhir per titik x parameter (memakai indeks unik titik, parameter, waktu)
    $akhir = db()->query(
        'select b.titik, b.parameter, b.waktu, b.nilai from pembacaan b
         join (select titik, parameter, max(waktu) w from pembacaan group by titik, parameter) m
           on m.titik = b.titik and m.parameter = b.parameter and m.w = b.waktu'
    )->fetchAll();
    $out = [];
    foreach (db()->query('select * from titik order by urutan')->fetchAll() as $t) {
        $t['wajib_baku_mutu'] = (bool) $t['wajib_baku_mutu'];
        $t['nilai'] = [];
        $out[$t['kode']] = $t;
    }
    foreach ($akhir as $a) {
        $p = $param[$a['parameter']];
        $v = (float) $a['nilai'];
        $out[$a['titik']]['nilai'][$a['parameter']] = [
            'nilai' => $v, 'waktu' => date('c', strtotime($a['waktu'])),
            'status' => $out[$a['titik']]['wajib_baku_mutu']
                ? status($v, $p['bm_min'] === null ? null : (float) $p['bm_min'], $p['bm_maks'] === null ? null : (float) $p['bm_maks'])
                : 'dipantau',
        ];
    }
    return json($r, ['data' => array_values($out)]);
});

$app->get('/api/v1/pembacaan', function (Req $q, Res $r) {
    $p = $q->getQueryParams();
    $titik = pilihan($p, 'titik', TITIK, 'S4');
    $param = pilihan($p, 'parameter', PARAM);
    $jam = angka($p, 'jam', 1, 168, 24);
    $interval = angka($p, 'interval', 1, 240, 15);   // menit per kelompok rata-rata
    $st = db()->prepare(
        'select from_unixtime(floor(unix_timestamp(waktu) / (:i1 * 60)) * :i2 * 60) as waktu,
                round(avg(nilai), 3) as rata, min(nilai) as min, max(nilai) as maks, count(*) as n
         from pembacaan
         where titik = :t and parameter = :p and waktu >= now() - interval :j hour
         group by 1 order by 1'
    );
    $st->execute([':i1' => $interval, ':i2' => $interval, ':t' => $titik, ':p' => $param, ':j' => $jam]);
    $data = array_map(fn ($x) => ['waktu' => date('c', strtotime($x['waktu'])), 'rata' => (float) $x['rata'],
        'min' => (float) $x['min'], 'maks' => (float) $x['maks'], 'n' => (int) $x['n']], $st->fetchAll());
    return json($r, ['titik' => $titik, 'parameter' => $param, 'interval_menit' => $interval, 'data' => $data]);
});

$app->get('/api/v1/kejadian', function (Req $q, Res $r) {
    $p = $q->getQueryParams();
    $status = pilihan($p, 'status', ['aktif', 'semua'], 'semua');
    $limit = angka($p, 'limit', 1, 200, 20);
    $sql = 'select k.id, k.titik, k.parameter, pr.nama as nama_parameter, pr.satuan, k.mulai, k.selesai, k.puncak, k.batas
            from kejadian k join parameter pr on pr.kode = k.parameter'
         . ($status === 'aktif' ? ' where k.selesai is null' : '')
         . ' order by k.mulai desc limit ' . $limit;
    $rows = array_map(function ($x) {
        $x['id'] = (int) $x['id'];
        $x['puncak'] = (float) $x['puncak'];
        $x['batas'] = (float) $x['batas'];
        $x['mulai'] = date('c', strtotime($x['mulai']));
        $x['durasi_menit'] = (int) round(((isset($x['selesai']) ? strtotime($x['selesai']) : time()) - strtotime($x['mulai'])) / 60);
        $x['selesai'] = $x['selesai'] ? date('c', strtotime($x['selesai'])) : null;
        return $x;
    }, db()->query($sql)->fetchAll());
    return json($r, ['data' => $rows]);
});

$app->get('/api/v1/webhook', function (Req $q, Res $r) {
    $limit = angka($q->getQueryParams(), 'limit', 1, 100, 10);
    $log = db()->query("select id, waktu, url, dari, sampai, jumlah_data, status_http, durasi_ms, hasil, galat
                        from webhook_log order by id desc limit $limit")->fetchAll();
    $ring = db()->query("select
        (select max(waktu) from webhook_log where hasil = 'terkirim') as terakhir_terkirim,
        (select max(sampai) from webhook_log where hasil = 'terkirim') as data_terkirim_sampai,
        (select count(*) from webhook_log where hasil = 'gagal' and waktu >= now() - interval 24 hour) as gagal_24jam,
        (select count(*) from webhook_log where waktu >= now() - interval 24 hour) as total_24jam")->fetch();
    foreach (['terakhir_terkirim', 'data_terkirim_sampai'] as $k) $ring[$k] = $ring[$k] ? date('c', strtotime($ring[$k])) : null;
    $ring['gagal_24jam'] = (int) $ring['gagal_24jam'];
    $ring['total_24jam'] = (int) $ring['total_24jam'];
    $log = array_map(function ($x) {
        foreach (['waktu', 'dari', 'sampai'] as $k) $x[$k] = date('c', strtotime($x[$k]));
        foreach (['id', 'jumlah_data', 'status_http', 'durasi_ms'] as $k) $x[$k] = $x[$k] === null ? null : (int) $x[$k];
        return $x;
    }, $log);
    return json($r, ['ringkasan' => $ring, 'data' => $log]);
});

$app->get('/api/v1/lab', function (Req $q, Res $r) {
    $p = $q->getQueryParams();
    $titik = pilihan($p, 'titik', TITIK, 'S4');
    $st = db()->prepare('select l.tanggal_sampling, l.parameter, pr.nama as nama_parameter, pr.satuan, l.nilai, l.lab, l.catatan
                         from hasil_lab l join parameter pr on pr.kode = l.parameter
                         where l.titik = :t order by l.tanggal_sampling desc, l.parameter limit 50');
    $st->execute([':t' => $titik]);
    return json($r, ['titik' => $titik, 'data' => array_map('angkakan', $st->fetchAll())]);
});

function angkakan(array $x): array
{
    foreach (['bm_min', 'bm_maks', 'nilai'] as $k) {
        if (array_key_exists($k, $x)) $x[$k] = $x[$k] === null ? null : (float) $x[$k];
    }
    if (isset($x['desimal'])) $x['desimal'] = (int) $x['desimal'];
    return $x;
}

$app->run();
