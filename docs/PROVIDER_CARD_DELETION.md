# Hapus kartu dari inventori V3

Jalankan `supabase/migrations/0043_provider_delete_card.sql` di SQL Editor **project Supabase V3**, setelah migrasi 0039 dan 0041. Migrasi aman dijalankan ulang dan tidak menghapus kartu yang ada saat instalasi.

Di `/provider/cards`, pilih **Hapus Kartu**, ketik kode kartu yang ditampilkan, lalu **Konfirmasi Hapus**. Bisa digunakan untuk kartu belum diaktivasi maupun kartu aktif. Tombol **Batal** tidak mengubah data.

Penghapusan memerlukan akun provider aktif dan sesi 2FA (`aal2`), diperiksa ulang oleh RPC database. Akun pelanggan, sesi tanpa login, provider nonaktif, dan provider tanpa 2FA ditolak. Kode konfirmasi juga divalidasi oleh database. Jika RPC belum terpasang atau gagal, kartu tetap ditampilkan.

Kartu diberi `deleted_at`, status `retired`, serta QR/NFC dinonaktifkan. Kartu tidak muncul dalam inventori provider, daftar kartu pelanggan, atau jumlah kartu di analitik. URL acak maupun URL lama tidak dapat digunakan lagi untuk aktivasi atau membuka halaman publik. QR cetak dan isi NFC fisik tidak berubah, tetapi alamatnya tidak lagi berfungsi.

Data kartu dan hubungan riwayat disimpan di database, termasuk catatan audit `provider_delete_card`. Data bisnis, akun pelanggan, feedback, dan kartu lain tidak dihapus. Trigger mencegah kartu yang telah dihapus diaktifkan ulang melalui RPC pengaturan kartu. Tidak ada tombol pemulihan pada aplikasi; gunakan kartu baru bila diperlukan. Penghapusan dan audit berjalan dalam satu transaksi dengan penguncian kartu untuk mencegah perubahan bersamaan.

Pengujian: `node tests/provider-delete.cjs`, `npm run test:security`, `npm run test:language`, dan `npm run build`. Pengujian database memakai PGlite terisolasi; tidak menghapus kartu Supabase produksi.
