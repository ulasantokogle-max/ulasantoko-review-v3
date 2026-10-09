# Tombol TikTok — YukReview V3

## Mengaktifkan
1. Buka Supabase project V3 → SQL Editor → New query.
2. Salin seluruh isi `supabase/migrations/0050_landing_tiktok_link.sql`, lalu Run.
   Migrasi ini membutuhkan sistem masa aktif 0048/0049 yang sebelumnya telah dipasang.
3. Refresh Dashboard → Edit Halaman. Isi kolom TikTok, aktifkan **Tampilkan TikTok**, lalu Simpan.
4. Buka QR/NFC bisnis untuk mengecek tombol. Kolom kosong atau pilihan nonaktif menyembunyikan tombol.

## Ruang lingkup
Link tersimpan per bisnis dan dipakai semua kartu bisnis tersebut. Mendukung HTTPS
pada tiktok.com, www.tiktok.com, vm.tiktok.com dan vt.tiktok.com.

Migrasi menambah dua kolom dan tiga RPC baru. Tidak menghapus data atau mengganti
fungsi lama. Sebelum migrasi dijalankan, aplikasi memakai RPC lama dan kolom TikTok
belum aktif. Tidak mengubah Google Review, WhatsApp, Instagram, PDF, QR/NFC,
CAPTCHA/2FA atau aturan masa aktif. Dashboard kedaluwarsa tetap tidak dapat diedit;
halaman publik tetap aktif.

## Verifikasi
- Simpan link profil dan buka melalui tombol publik.
- Matikan pilihan tampilkan atau kosongkan link; tombol menghilang.
- Link ke domain lain ditolak sebelum proses penyimpanan.
- Refresh editor: link dan pilihan tampil tetap tersimpan.
- Preview menampilkan tombol tanpa membuka tautan.

Tidak memerlukan API key TikTok atau integrasi login TikTok.
