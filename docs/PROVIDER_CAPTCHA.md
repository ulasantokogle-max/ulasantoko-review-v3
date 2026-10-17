# CAPTCHA pada Menu Akses

Membuka `/access` menampilkan **Verifikasi Menu Akses** sebelum menu akses sistem terlihat. Setelah CAPTCHA lolos, **Lanjut ke Menu Akses** membuka menu. Klik **Buka Provider Portal** kemudian langsung melanjutkan tanpa CAPTCHA kedua selama cookie verifikasi masih berlaku. Membuka `/provider/cards` atau `/provider/security` secara langsung tanpa cookie valid mengarahkan pengguna ke `/access`.

Cloudflare Turnstile diverifikasi oleh server melalui Siteverify, termasuk action `provider_entry` dan hostname halaman. Setelah lolos, server membuat cookie HttpOnly dengan tanda tangan HMAC, khusus hostname tersebut, berlaku 15 menit dengan Path `/` agar halaman `/access` dan provider membaca pass yang sama. Nama cookie baru `provider_access_captcha` menghindari benturan dengan cookie lama yang hanya berlaku pada Path `/provider`. Cookie ini hanya melewati pemeriksaan CAPTCHA; keanggotaan provider, login, MFA dan otorisasi RPC tetap wajib. CAPTCHA ini melindungi masuk ke halaman provider, bukan menggantikan perlindungan CAPTCHA atau pembatasan percobaan pada endpoint Auth Supabase.

## Aktivasi di layanan

1. Buka Cloudflare Dashboard → Turnstile → Add widget. Pilih tipe **Managed**.
2. Tambahkan hostname `yukreview.id`, `www.yukreview.id`, dan `reputasipro.ulasantoko.space` jika domain lama masih dipakai membuka provider. Jika menguji URL deployment Vercel, tambahkan hostname deployment spesifik yang dipakai.
3. Di Vercel, pilih proyek **ulasantoko-review-v3** → Settings → Environment Variables. Pasang kedua variabel pada environment **Preview** untuk branch `cleanup/production-surface-v1` yang dipakai domain sekarang (dan Production sebelum rilis produksi):
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Site Key widget.
   - `TURNSTILE_SECRET_KEY`: Secret Key widget. Simpan sebagai rahasia server; jangan gunakan awalan `NEXT_PUBLIC_` dan jangan kirim di chat.
4. Redeploy branch tersebut setelah kedua variabel tersimpan.
5. Buka incognito: `https://yukreview.id/access` → selesaikan CAPTCHA → **Lanjut ke Menu Akses** → **Buka Provider Portal** → login dan MFA seperti sebelumnya. Uji juga URL langsung `/provider/cards` dan `/provider/security`.

Tanpa kedua key, perubahan diterbitkan dalam keadaan belum aktif dan perlindungan login/MFA sebelumnya tetap berjalan. Jika hanya satu key terpasang, portal diblokir dengan pesan konfigurasi sedang disiapkan. Setelah kedua key dipasang, kegagalan Cloudflare, token kedaluwarsa/terpakai ulang, action salah, atau hostname salah tidak membuka portal. Tidak ada key demo yang otomatis digunakan di deployment.

Tidak memerlukan migrasi SQL. Halaman pelanggan, QR, NFC dan aktivasi kartu tidak diberi CAPTCHA ini.

## Validasi lokal

`npm run test:captcha`, `npm run test:mfa`, `npm run test:language`, dan `npm run build`. Pemeriksaan mencakup menu tersembunyi sebelum verifikasi, penolakan cookie palsu/kedaluwarsa, redirect URL provider langsung, dan pass yang dipakai bersama tanpa CAPTCHA kedua. Perubahan membutuhkan deployment terbaru; key Turnstile sebelumnya tetap dipakai.

Dokumentasi resmi:
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
