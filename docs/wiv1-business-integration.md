# YukReview x WiV1 — navigasi bisnis terisolasi

## Cakupan
Integrasi hanya menambah pintasan pada website dan dashboard YukReview menuju portal WiV1.
Tidak ada perubahan database, RPC, Supabase Auth, PIN kartu, aktivasi Google Review,
API, maupun akses service-role di antara kedua project.

## URL
- `/bisnis/wifi` — halaman informasi WiFi NFC+QR di YukReview.
- `/dashboard` — sidebar hanya menambah link WiFi NFC+QR, tetap menggunakan login YukReview.
- `NEXT_PUBLIC_WIV1_PORTAL_URL` — origin HTTPS portal WiV1 (tanpa path/query), contoh `https://wifi.yukreview.id` **hanya setelah domain benar-benar aktif**.
- Yang diperbolehkan: `wifi.yukreview.id` atau host Preview `*.vercel.app`.
- Jika variabel belum diatur, tampilkan informasi bahwa portal belum aktif. Jangan arahkan pengguna ke domain tebakan.

## Deployment aman
1. Buat Preview dari branch feature ini (jangan merge ke main).
2. Pastikan domain portal Preview WiV1 benar-benar mengarah ke deployment WiV1 Preview dengan DB staging.
3. Atur `NEXT_PUBLIC_WIV1_PORTAL_URL` **Preview only** ke origin Preview WiV1 yang telah diverifikasi. Ini variabel publik berisi URL, tidak mengandung token.
4. Buka homepage, klik layanan WiFi, cek link Client dan Provider, kembali ke Dashboard YukReview. Uji login WiV1 terpisah.
5. Periksa fitur Google Review lama (login, aktivasi, landing page, kartu, feedback, analytics).
6. Untuk production, siapkan domain resmi dan pemetaan Vercel di project WiV1 secara terpisah setelah QA. Pasang env Production pada YukReview **hanya setelah WiV1 Production siap**, jangan gunakan URL Preview sebagai tujuan permanen.
7. Jangan salin Supabase keys, JWT, cookies, PIN, atau data bisnis antar aplikasi.

## Rollback
Perubahan ini hanya terkait navigasi. Jika uji gagal, jangan merge branch. Setelah rilis,
rollback commit UI di repo YukReview saja. Tidak ada perubahan skema yang perlu dibatalkan.
