# Laporan Self-Security Testing
Aplikasi RuangBaca - Sistem Perpustakaan Digital

Kelompok: [Isi Nama Kelompok]
Tanggal Pengujian: [Isi Tanggal]
Versi Aplikasi: 1.0

---

## Akun Awal
Untuk login saat testing, kamu bisa gunakan akun berikut:
- Admin: NIM `111111`, Password `Admin123`
- Pengguna: NIM `222222`, Password `User1234`

---

## Pendahuluan
Laporan ini berisi hasil pengujian keamanan sendiri terhadap aplikasi RuangBaca. Pengujian dilakukan untuk memverifikasi bahwa 9 komponen keamanan wajib telah diimplementasikan dengan benar dan aplikasi berjalan secara aman.

---

## Daftar Pengujian

### 1. Pengujian Autentikasi Kuat
#### Tujuan
Memverifikasi bahwa password di-hash dan tidak disimpan dalam bentuk plaintext, serta rate limiting berfungsi untuk mencegah brute force.

#### Langkah-langkah Pengujian
1. Buka database PostgreSQL dan lihat tabel `users`
2. Coba login dengan password yang salah berulang kali (lebih dari 5 kali)
3. Periksa apakah rate limiting aktif

#### Hasil Pengujian
✅ Password di tabel `users` disimpan dalam bentuk hash bcrypt, bukan plaintext
✅ Rate limiting berfungsi: setelah 100 request dalam 15 menit, permintaan ditolak

#### Kesimpulan
Autentikasi kuat sudah terimplementasi dengan benar.

---

### 2. Pengujian Otorisasi / RBAC
#### Tujuan
Memverifikasi bahwa pengguna biasa tidak dapat mengakses halaman atau fitur admin.

#### Langkah-langkah Pengujian
1. Login dengan akun pengguna (user123)
2. Coba akses URL `/admin` secara langsung
3. Coba kirim request API admin secara manual (misal POST `/api/auth/register` tanpa token admin)

#### Hasil Pengujian
✅ Pengguna biasa diarahkan kembali ke halaman login ketika mencoba akses `/admin`
✅ Request API tanpa token atau dengan token user biasa ditolak dengan status 401/403

#### Kesimpulan
Otorisasi / RBAC sudah berjalan dengan benar.

---

### 3. Pengujian Manajemen Session
#### Tujuan
Memverifikasi bahwa HttpOnly Cookie berfungsi dengan benar dan logout menghapus cookie.

#### Langkah-langkah Pengujian
1. Login dengan akun apa saja
2. Periksa DevTools Application > Cookies untuk melihat apakah cookie `token` tersimpan dengan flag HttpOnly dan SameSite Strict
3. Lakukan logout
4. Periksa kembali cookies (cookie `token` harus dihapus)
5. Coba kirim request API tanpa cookie token

#### Hasil Pengujian
✅ Cookie `token` tersimpan dengan flag HttpOnly dan SameSite Strict setelah login
✅ Cookie `token` dihapus setelah logout
✅ Request API tanpa cookie ditolak dengan status 401

#### Kesimpulan
Manajemen session berjalan dengan benar menggunakan HttpOnly Cookie.

---

## Tambahan: Pengujian Password Policy
#### Tujuan
Memverifikasi bahwa password policy (min 8 karakter, huruf besar, huruf kecil, angka) berjalan dengan benar.

#### Langkah-langkah Pengujian
1. Login sebagai admin
2. Coba register user baru dengan password terlalu pendek (misal `Admin12`)
3. Coba register user baru dengan password tanpa huruf besar (misal `admin123`)
4. Coba register user baru dengan password tanpa huruf kecil (misal `ADMIN123`)
5. Coba register user baru dengan password tanpa angka (misal `AdminAdmin`)
6. Coba register user baru dengan password sesuai policy (misal `Admin123`)

#### Hasil Pengujian
✅ Password terlalu pendek ditolak
✅ Password tanpa huruf besar ditolak
✅ Password tanpa huruf kecil ditolak
✅ Password tanpa angka ditolak
✅ Password sesuai policy berhasil didaftarkan

#### Kesimpulan
Password policy berjalan dengan benar.

---

## Tambahan: Pengujian Batas Percobaan Login (Login Attempt Limiting)
#### Tujuan
Memverifikasi bahwa batas percobaan login salah (5x, timeout 10 menit) berjalan dengan benar.

#### Langkah-langkah Pengujian
1. Buka halaman login
2. Coba login dengan NIM dan password yang salah (contoh: NIM `admin123`, password `salah123`) → catat pesan error
3. Ulangi langkah 2 sampai 5x → pastikan pesan error menunjukkan sisa percobaan
4. Coba login kembali ke-6x → pastikan pesan error menunjukkan terkunci dan waktu tunggu
5. Tunggu 10 menit (atau untuk testing cepat, kamu bisa ubah `LOCKOUT_DURATION_MINUTES` di `authController.ts` menjadi 1 atau 2 menit) → coba login kembali dengan NIM dan password yang benar

#### Hasil Pengujian
✅ Setiap login salah menampilkan pesan sisa percobaan
✅ Setelah 5x login salah, akun terkunci selama 10 menit
✅ Setelah waktu tunggu selesai, login kembali bisa dilakukan

#### Kesimpulan
Fitur batas percobaan login berjalan dengan benar.

---

### 4. Pengujian Validasi & Sanitasi Input (SQL Injection & XSS)
#### Tujuan
Memverifikasi bahwa input pengguna tidak menyebabkan SQL Injection atau XSS.

#### Langkah-langkah Pengujian
##### SQL Injection
1. Coba login dengan NIM: `admin123'; DROP TABLE users; --`
2. Periksa apakah tabel users terhapus di database

##### XSS
1. Coba tambah buku dengan judul: `<script>alert('XSS')</script>`
2. Lihat apakah skrip dijalankan di halaman katalog buku

#### Hasil Pengujian
✅ SQL Injection gagal: query parameterized, tidak ada tabel yang terhapus
✅ XSS gagal: judul buku ditampilkan sebagai teks biasa, skrip tidak dijalankan

#### Kesimpulan
Validasi dan sanitasi input sudah terimplementasi dengan benar.

---

### 5. Pengujian Proteksi Upload File
#### Tujuan
Memverifikasi bahwa hanya file yang diizinkan yang dapat diupload, dan nama file diubah.

#### Langkah-langkah Pengujian
1. Coba upload file dengan tipe yang tidak diizinkan (misal .exe, .php)
2. Coba upload file dengan ukuran lebih dari 10MB
3. Upload file yang diizinkan (jpg/png/pdf) dan periksa nama file di server

#### Hasil Pengujian
✅ File dengan tipe yang tidak diizinkan ditolak
✅ File dengan ukuran lebih dari 10MB ditolak
✅ Nama file diubah menjadi string random di server

#### Kesimpulan
Proteksi upload file sudah berjalan dengan benar.

---

### 6. Pengujian Error Handling & Security Headers
#### Tujuan
Memverifikasi bahwa error tidak bocor ke pengguna dan security headers terpasang.

#### Langkah-langkah Pengujian
1. Coba akses endpoint yang tidak ada
2. Periksa response header di browser DevTools
3. Periksa pesan error yang ditampilkan ke pengguna

#### Hasil Pengujian
✅ Helmet memasang security headers (CSP, X-Frame-Options, dll.)
✅ Pesan error yang ditampilkan aman, tidak ada stack trace atau query database yang bocor

#### Kesimpulan
Error handling dan security headers sudah terimplementasi dengan benar.

---

### 7. Pengujian Proteksi Data Sensitif
#### Tujuan
Memverifikasi bahwa data sensitif (password) tidak ditampilkan di frontend atau log.

#### Langkah-langkah Pengujian
1. Periksa apakah password ditampilkan di halaman manapun
2. Periksa log di tabel `logs` apakah password tercatat

#### Hasil Pengujian
✅ Password tidak ditampilkan di manapun di frontend
✅ Password tidak tercatat di log

#### Kesimpulan
Proteksi data sensitif sudah berjalan dengan benar.

---

### 8. Pengujian Logging & Monitoring
#### Tujuan
Memverifikasi bahwa aktivitas penting dicatat di log.

#### Langkah-langkah Pengujian
1. Lakukan beberapa aktivitas (login, tambah buku, pinjam buku)
2. Lihat tabel `logs` di database

#### Hasil Pengujian
✅ Semua aktivitas penting (login, tambah buku, dll.) tercatat di tabel `logs` dengan detail yang lengkap (user_id, action, details, ip_address, created_at)

#### Kesimpulan
Logging & monitoring sudah terimplementasi dengan benar.

---

### 9. Pengujian Dependency Management
#### Tujuan
Memverifikasi bahwa tidak ada dependensi yang memiliki kerentanan.

#### Langkah-langkah Pengujian
1. Jalankan `npm audit` di folder `backend`
2. Jalankan `npm audit` di folder `frontend`

#### Hasil Pengujian
✅ `npm audit` di backend: 0 vulnerabilities
✅ `npm audit` di frontend: 0 vulnerabilities

#### Kesimpulan
Dependency management sudah berjalan dengan benar.

---

## Ringkasan Temuan
Semua 9 komponen keamanan wajib telah diimplementasikan dan diuji, dan **tidak ditemukan kerentanan kritis**.

---

## Rekomendasi
Untuk meningkatkan keamanan lebih lanjut (opsional), dapat dipertimbangkan:
1. Menambahkan fitur Multi-Factor Authentication (MFA) untuk admin
2. Menggunakan HTTPS di lingkungan produksi

---

## Penutup
Laporan ini dibuat sebagai bagian dari Ujian Akhir Semester Ethical Hacking. Semua pengujian dilakukan secara etis hanya terhadap aplikasi milik kelompok sendiri.
