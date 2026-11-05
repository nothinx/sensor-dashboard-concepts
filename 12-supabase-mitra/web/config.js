// Konfigurasi koneksi Supabase untuk peramban.
// EMULATOR (default): nilai bawaan Supabase CLI lokal. Kunci anon lokal ini kunci demo publik milik Supabase CLI,
// bukan rahasia. Keamanan data bergantung pada Row Level Security, bukan pada kerahasiaan kunci anon.
// CLOUD: ganti target, url, dan anonKey dengan nilai dari Project Settings > API proyek Supabase milik klien
// (lihat docs/CLOUD.md).
window.KONFIG = {
  target: "emulator",
  url: "http://127.0.0.1:18121",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
};
