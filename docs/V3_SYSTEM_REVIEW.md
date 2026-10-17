# Pemeriksaan sistem V3

## Perbaikan

- Kuota Google tidak lagi dapat dihabiskan lewat RPC langsung dari akun pelanggan/provider setelah migrasi 0046. Reservasi khusus server; batas tetap 140/hari, zona Asia/Jakarta.
- Setup Google memeriksa akses ke bisnis yang diminta sebelum menghubungi Google. Resolver membutuhkan bisnis aktif milik akun.
- Penyimpanan link Maps yang sama memakai profil tersimpan, tanpa panggilan Google atau reservasi kuota baru.
- Daftar bisnis dari respons akun/reload lama tidak dapat mengganti bisnis akun saat ini. Pilihan bisnis di luar daftar ditolak.
- Penyimpanan editor berhenti bila akun berubah di tengah proses; kegagalan jaringan melepaskan status sibuk dan mempertahankan draft.
- Form/pratinjau bisnis lama disembunyikan saat akun atau bisnis baru sedang dimuat. Draft di atas batas 64 KiB tidak dilaporkan berhasil tersimpan karena tidak dapat dipulihkan oleh pembacanya.
- Kartu tidak ditemukan atau gagal diperiksa menampilkan pesan serta tombol coba lagi, tanpa form pendaftaran/aktivasi. Respons pemeriksaan kartu lama diabaikan.
- Dokumentasi arsitektur diperbarui sesuai alur Google Review tanpa gating.

## Pemasangan yang masih perlu dilakukan operator

1. Vercel → proyek V3 → Settings → Environment Variables: pasang `SUPABASE_SECRET_KEY` sebagai Secret, dari Supabase **V3** → Settings → API Keys → Secret keys. Jangan gunakan publishable/anon key dan jangan gunakan prefiks `NEXT_PUBLIC_`.
2. Pilih environment yang melayani `yukreview.id` (termasuk Preview branch `cleanup/production-surface-v1` bila domain masih menempel pada branch tersebut), kemudian redeploy.
3. Supabase **V3** → SQL Editor: jalankan seluruh `supabase/migrations/0046_google_quota_server_only.sql` setelah 0042. Tidak menghapus atau mereset kuota/data bisnis.
4. Periksa izin menggunakan query berikut. Hasil harus `false`, `false`, `true`.

```sql
select
  has_function_privilege('anon', 'public.v3_reserve_google_request()', 'EXECUTE') as anon_can_reserve,
  has_function_privilege('authenticated', 'public.v3_reserve_google_request()', 'EXECUTE') as customer_can_reserve,
  has_function_privilege('service_role', 'public.v3_reserve_google_request()', 'EXECUTE') as server_can_reserve;
```

Tanpa secret server, pencarian Maps baru berhenti sementara dengan pesan umum. Kartu, QR/NFC, halaman publik, feedback, dan link Google yang sudah tersimpan tetap tersedia. Izin RPC lama belum tertutup di database live sebelum 0046 dijalankan. Jangan menjalankan ulang 0042 sesudah 0046.

## Cakupan validasi

`npm run test:all` menjalankan seluruh suite otomatis: aktivasi → editor, respons bisnis/akun yang terlambat, draft dan jaringan gagal, akses API, database PostgreSQL terisolasi, RLS antar bisnis, PIN, quota, penghapusan kartu, CAPTCHA, MFA, bahasa, QR, NFC, tema, rating dan feedback. `npm run build` memeriksa build produksi dan tipe.

Hasil pemeriksaan kode ini: 17 suite lulus, build produksi lulus, `git diff --check` lulus, dan `npm audit --omit=dev` melaporkan 0 kerentanan dependensi produksi. Variabel secret Supabase tidak ditemukan pada bundle JavaScript browser hasil build. Audit dependensi hanya mencakup kerentanan yang tercatat dalam basis data npm pada saat pemeriksaan.

Tes database memakai PostgreSQL lokal terisolasi; tidak membuktikan konfigurasi Supabase live sudah sesuai. Tes CAPTCHA/Google memakai respons simulasi dan tidak menghabiskan kuota Google. Penulisan NFC pada perangkat fisik, pengiriman email nyata, dan aktivasi dengan dua akun pelanggan live masih memerlukan pengujian operator. Pemeriksaan ini bukan sertifikasi bahwa tidak ada celah lain.
