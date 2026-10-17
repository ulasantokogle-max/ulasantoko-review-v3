# Tombol YouTube — YukReview V3

1. Pastikan migrasi 0050 untuk TikTok telah dijalankan.
2. Buka SQL Editor Supabase project V3, salin seluruh isi
   `supabase/migrations/0051_landing_youtube_link.sql`, lalu Run.
3. Refresh Dashboard → Edit Halaman. Isi link YouTube, aktifkan
   **Tampilkan YouTube**, lalu Simpan.
4. Buka QR/NFC bisnis untuk mengecek tombol.

Mendukung link channel, video dan Shorts menggunakan HTTPS pada youtube.com,
www.youtube.com, m.youtube.com dan youtu.be. Link kosong atau pilihan nonaktif
menyembunyikan tombol. Tidak memakai YouTube API atau membutuhkan API key.

Link tersimpan per bisnis, berlaku untuk semua kartunya. Penambahan dua kolom
dan tiga RPC baru tidak mengganti fungsi lama atau menghapus data. Sebelum
migrasi dipasang, editor tetap memakai fungsi TikTok/landing lama dan kolom
YouTube belum aktif. Draft lama tetap bisa dipulihkan. Dashboard kedaluwarsa
tetap terkunci untuk pengelolaan, QR/NFC dan halaman publik tetap aktif.

Verifikasi: simpan dan refresh editor, matikan tampilan lalu cek publik, hapus
link lalu simpan, dan pastikan tombol TikTok/Instagram/WhatsApp/PDF tetap bekerja.
