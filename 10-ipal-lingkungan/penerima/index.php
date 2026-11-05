<?php
// Penerima webhook TIRUAN, pengganti sistem pelaporan lingkungan eksternal untuk uji lokal.
// [REAL DATA: spesifikasi sistem pelaporan lingkungan] — format asli belum diketahui.
// Perilaku: verifikasi tanda tangan HMAC; setiap permintaan ke-4 sengaja dijawab 503 untuk menguji alur gagal + kirim ulang.
declare(strict_types=1);

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"pesan":"Hanya POST"}'; exit; }

$body = file_get_contents('php://input');
$harap = 'sha256=' . hash_hmac('sha256', $body, (string) getenv('WEBHOOK_SECRET'));
if (!hash_equals($harap, $_SERVER['HTTP_X_SIGNATURE_256'] ?? '')) {
    http_response_code(401);
    echo '{"pesan":"Tanda tangan tidak cocok"}';
    exit;
}
$f = sys_get_temp_dir() . '/hitung';
$n = (int) @file_get_contents($f) + 1;
file_put_contents($f, (string) $n);
if ($n % 4 === 0) {
    http_response_code(503);
    echo '{"pesan":"Layanan penerima sedang sibuk, kirim ulang nanti"}';
    exit;
}
$data = json_decode($body, true);
http_response_code(202);
echo json_encode(['diterima' => count($data['data'] ?? []), 'kunci' => $_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? null]);
