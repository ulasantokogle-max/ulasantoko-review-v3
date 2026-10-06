# Pengirim email autentikasi YukReview

Target pengirim: **YukReview <noreply@yukreview.id>**.

Status: template dan panduan siap; pengirim live belum diubah oleh commit ini. Sender berada di konfigurasi Auth Supabase, bukan aplikasi Next.js atau environment Vercel. Memerlukan layanan SMTP, verifikasi DNS, dan penyimpanan kredensial pada proyek **V3**. Panduan ini memakai Resend sebagai jalur setup; layanan SMTP existing juga bisa digunakan jika sudah tersedia.

## 1. Verifikasi domain pengirim

1. Buka https://resend.com → daftar/login → **Domains → Add domain**.
2. Masukkan `yukreview.id` agar alamat From dapat memakai `noreply@yukreview.id`.
3. Pilih region yang tersedia sesuai kebutuhan. Resend akan menampilkan record DNS untuk domain dan region tersebut.
4. Pada pengelola DNS aktif `yukreview.id`, tambahkan record **sending** yang ditampilkan Resend, termasuk DKIM dan SPF/Return-Path. Salin Name, Type, Value dan Priority persis dari dashboard. Nilai DNS tidak dapat ditebak dari repository.
5. Pertahankan record A/CNAME Vercel dan record email lain yang sudah ada. Record MX untuk pengiriman biasanya ditempatkan pada subdomain Return-Path yang diberikan Resend; jangan mengganti MX root untuk penerimaan email dengan record tersebut. Jika record pengiriman berada pada hostname yang sudah memiliki SPF, gabungkan sesuai konfigurasi provider agar tidak ada dua record SPF pada hostname yang sama.
6. Klik **Verify DNS Records** hingga status domain **Verified**. Pengiriman email saja tidak membuat kotak masuk `noreply@yukreview.id`; receiving/mailbox merupakan pengaturan terpisah.
7. Buat API Key Resend dengan izin pengiriman dan pembatasan domain `yukreview.id` jika opsi tersebut tersedia. Matikan click/open tracking untuk email Auth agar link konfirmasi tidak diubah oleh pelacakan.

## 2. Custom SMTP pada Supabase V3

Buka **Authentication → Notifications → Email → SMTP Settings**. Pada dashboard yang memakai navigasi lama, cari **Custom SMTP** di bagian Authentication.

Setelah domain Verified, aktifkan custom SMTP dan isi:

| Pengaturan | Nilai |
| --- | --- |
| Sender email | `noreply@yukreview.id` |
| Sender name | `YukReview` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | API Key Resend untuk pengiriman |

Simpan kredensial langsung di dashboard Supabase. Tidak perlu `RESEND_API_KEY` di Vercel untuk alur SMTP ini. Jangan menempelkan kredensial ke chat, repository, SQL Editor, atau variabel `NEXT_PUBLIC_*`.

Catat pengaturan pengirim sebelumnya secara privat agar dapat dipulihkan jika pengujian gagal. Pertahankan email confirmation aktif dan konfigurasi rate limit Auth saat mengganti SMTP.

## 3. Template email konfirmasi

Di **Authentication → Email Templates** (atau **Notifications → Email → Templates**), buka **Confirm signup**:

- Subject: `Konfirmasi email akun YukReview`
- Body: salin isi `supabase/email-templates/confirm-signup.html` dari repository ini.

Simpan. Template menggunakan `{{ .ConfirmationURL }}` asli Supabase: verifikasi token dan tujuan aktivasi kartu tetap mengikuti alur Auth saat ini. Jangan mengganti variabel ini dengan link dashboard statis atau menambahkan token manual.

Konfigurasi SMTP mengubah pengirim seluruh email Auth proyek ini. Template HTML yang disediakan hanya untuk Confirm signup; template lain tidak perlu diubah untuk mengganti pengirim.

## 4. Tujuan setelah konfirmasi

Pada **Authentication → URL Configuration**:

- Site URL: `https://yukreview.id`
- Redirect URLs: `https://yukreview.id/activate/*`
- Pertahankan `https://reputasipro.ulasantoko.space/activate/*` untuk kartu lama.

Aplikasi sudah memakai origin halaman aktivasi saat signup dan resend. Domain pengirim tidak harus sama dengan hostname link verifikasi: endpoint verifikasi Supabase pada link email merupakan bagian dari Auth; setelah verifikasi pengguna kembali ke URL aktivasi yang diizinkan.

## 5. Pengujian penerimaan

1. Gunakan satu akun pelanggan uji yang belum terdaftar melalui aktivasi kartu di `yukreview.id` (atau kirim ulang konfirmasi untuk akun uji yang belum dikonfirmasi).
2. Pastikan email **baru** menampilkan nama YukReview dan From `noreply@yukreview.id`. Email lama dalam inbox tidak berubah.
3. Periksa header Gmail **Show original**: SPF/DKIM/DMARC dan domain pengirim; evaluasi hasil sesuai DNS provider. Jika gagal, periksa DNS sebelum melanjutkan rollout.
4. Klik konfirmasi satu kali dan pastikan kembali ke aktivasi kartu yang sama serta akun berhasil dikonfirmasi. Jangan membuka link milik pelanggan lain untuk pengujian.
5. Cek delivery log Resend dan Auth log Supabase jika email tidak datang, termasuk folder Spam dan batas pengiriman.

Perubahan ini tidak membutuhkan migrasi SQL atau redeploy Vercel. Jangan menandai SMTP selesai sebelum email live diterima dengan pengirim baru.

## Referensi resmi

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://resend.com/docs/send-with-supabase-smtp
- https://resend.com/docs/dashboard/domains/introduction
