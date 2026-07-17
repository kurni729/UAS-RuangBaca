# Standard Operating Procedure (SOP)
Penggunaan & Pengelolaan Aplikasi RuangBaca

Nama Aplikasi: RuangBaca - Sistem Perpustakaan Digital
Nomor SOP: SOP-RUANGBACA-001
Kelompok: 2
Versi: 1.0
Disusun oleh: - Kurniawan
              - Muhammad Al-Fatih
              - Muhammad Faisal Bakeri
              - Nor Halimah
              - Saudah
Tanggal berlaku: 17 Juli
Disetujui oleh: Risqa Taufik M.Kom
Tinjauan berikutnya: 1 Januari 2027

---

## Akun Awal
Untuk login pertama kali, kamu bisa gunakan akun berikut:
- **Admin**:
  - NIM: `111111`
  - Password: `Admin123`
- **Pengguna**:
  - NIM: `222222`
  - Password: `User1234`

---

## 1. Tujuan & Ruang Lingkup
Tujuan SOP ini adalah untuk memastikan penggunaan dan pengelolaan aplikasi RuangBaca secara aman, efektif, dan sesuai dengan prinsip keamanan perangkat lunak.
Ruang lingkup SOP ini mencakup seluruh aktivitas di aplikasi RuangBaca, mulai dari registrasi/login, pengelolaan buku dan pengguna, hingga penanganan insiden keamanan.

---

## 2. Peran & Tanggung Jawab

### Admin

**Hak Akses**
- Login dan logout
- Menambah, mengubah, dan menghapus data buku
- Mengonfirmasi peminjaman dan pengembalian buku
- Melihat seluruh riwayat peminjaman
- Menambah dan menghapus pengguna
- Melihat log aktivitas sistem

**Tanggung Jawab**
- Menjaga keamanan akun admin
- Mengelola data buku dan pengguna dengan benar
- Memantau log aktivitas secara berkala
- Memproses permintaan peminjaman dan pengembalian secara tepat waktu
- Menangani dan melaporkan insiden keamanan

### Pengguna

**Hak Akses**
- Login dan logout
- Melihat katalog buku
- Meminjam buku
- Melihat riwayat peminjaman pribadi

**Tanggung Jawab**
- Menjaga keamanan akun dan tidak membagikan kata sandi
- Mematuhi aturan peminjaman dan pengembalian buku
- Melaporkan aktivitas mencurigakan kepada admin
---

## 3. Prosedur Registrasi & Login yang Aman
### Registrasi Pengguna Baru
Hanya Admin yang dapat mendaftarkan pengguna baru:
1. Admin login ke akun admin
2. Buka tab "Kelola Pengguna"
3. Klik tombol "Tambah Pengguna"
4. Isi formulir:
   - NIM: Nomor Induk Mahasiswa yang valid (unik)
   - Password: **Wajib** memenuhi kriteria berikut:
     - Minimal 8 karakter
     - Memiliki setidaknya 1 huruf besar (A-Z)
     - Memiliki setidaknya 1 huruf kecil (a-z)
     - Memiliki setidaknya 1 angka (0-9)
   - Role: Pilih "user" atau "admin"
5. Klik "Simpan"

### Login
1. Buka halaman login di `http://localhost:5173`
2. Masukkan NIM dan password
3. Klik tombol "Login"
4. Jika login salah, Anda akan melihat pesan sisa percobaan login
5. Jika login salah lebih dari 5 kali berturut-turut, akses dari IP Anda akan terkunci selama 10 menit
6. Setelah login berhasil, pengguna akan diarahkan ke dashboard sesuai rolenya (token disimpan di HttpOnly Cookie untuk keamanan)

### Logout
1. Klik tombol "Logout" di sidebar/navbar
2. Cookie autentikasi `token` akan dihapus dari browser
3. Pengguna akan diarahkan kembali ke halaman login

---

## 4. Prosedur Pengelolaan Hak Akses
### Menambah Hak Akses Baru
1. Admin login ke akun admin
2. Buka tab "Kelola Pengguna"
3. Klik tombol "Tambah Pengguna"
4. Isi NIM, password, dan pilih role
5. Simpan

### Mencabut Hak Akses
1. Admin login ke akun admin
2. Buka tab "Kelola Pengguna"
3. Cari pengguna yang ingin dihapus
4. Klik tombol "Hapus"
5. Konfirmasi penghapusan

### Prinsip Least Privilege
- Setiap pengguna hanya diberikan hak akses sesuai dengan kebutuhan (tidak lebih)
- Hanya orang yang benar-benar membutuhkan yang diberikan role admin
- Tinjau hak akses secara berkala (setiap 3 bulan)

---

## 5. Prosedur Upload & Pengelolaan Dokumen
### Upload Buku Baru
1. Admin login ke akun admin
2. Buka tab "Kelola Buku"
3. Klik tombol "Tambah Buku"
4. Isi formulir:
   - Judul buku: Wajib diisi
   - Penulis: Wajib diisi
   - Rak: Opsional (lokasi rak buku di perpustakaan fisik)
5. Upload file:
   - Cover buku: Format JPG/PNG, ukuran maksimal 10MB
   - File buku: Format PDF, ukuran maksimal 10MB
6. Klik "Simpan"
7. File akan disimpan di server dengan nama file random untuk keamanan

### Edit Buku
1. Admin login ke akun admin
2. Buka tab "Kelola Buku"
3. Cari buku yang ingin diedit
4. Klik tombol "Edit"
5. Ubah data yang ingin diubah
6. Klik "Simpan"

### Hapus Buku
1. Admin login ke akun admin
2. Buka tab "Kelola Buku"
3. Cari buku yang ingin dihapus
4. Klik tombol "Hapus"
5. Konfirmasi penghapusan
6. File cover dan file buku akan dihapus dari server secara otomatis

---

## 6. Prosedur Backup & Pemulihan Data
### Backup Database
1. Lakukan backup database PostgreSQL secara berkala (setiap hari)
2. Simpan file backup di lokasi yang aman dan terenkripsi
3. Perintah backup:
   ```bash
   pg_dump -U postgres perpustakaan_db > backup_$(date +%Y%m%d).sql
   ```

### Pemulihan Data
Jika terjadi kehilangan atau kerusakan data:
1. Siapkan file backup terbaru
2. Jalankan perintah restore:
   ```bash
   psql -U postgres -d perpustakaan_db -f backup_YYYYMMDD.sql
   ```
3. Verifikasi data telah kembali normal
4. Catat insiden dan penyebabnya di log internal

---

## 7. Prosedur Logging & Peninjauan Aktivitas
### Aktivitas yang Dicatat
Semua aktivitas penting dicatat di tabel `logs` di database:
- Login berhasil dan gagal
- Tambah, edit, hapus buku
- Konfirmasi peminjaman dan pengembalian
- Tambah, hapus pengguna

### Peninjauan Log
1. Admin login ke akun admin
2. Lihat log di database (menggunakan pgAdmin atau psql)
3. Lakukan peninjauan log secara berkala (setiap minggu)
4. Jika ditemukan aktivitas mencurigakan, laporkan dan tindak lanjuti sesuai prosedur penanganan insiden

### Perlindungan Log
- Log tidak boleh dihapus tanpa alasan yang jelas
- Log harus disimpan setidaknya selama 90 hari
- Hanya admin yang dapat mengakses log

---

## 8. Prosedur Penanganan Insiden
Jika terjadi insiden keamanan (misal akun bocor, akses mencurigakan, kebocoran data):
1. **Deteksi**: Kenali insiden secepat mungkin (dari log, laporan pengguna, dll)
2. **Isolasi**: Batasi akses ke sistem jika perlu (misal nonaktifkan akun yang dicurigai)
3. **Pelaporan**: Laporkan insiden ke dosen atau pihak yang berwenang segera
4. **Analisis**: Cari tahu penyebab insiden
5. **Pemulihan**: Perbaiki kerentanan dan pulihkan sistem ke kondisi aman
6. **Dokumentasi**: Catat seluruh proses penanganan insiden untuk evaluasi di masa depan

---

## 9. Do & Don't Pengguna
### ✓ Lakukan
- Gunakan password yang kuat dan unik
- Ganti password secara berkala (setiap 3 bulan)
- Logout setelah selesai menggunakan aplikasi
- Laporkan segera jika menemukan aktivitas mencurigakan
- Gunakan aplikasi sesuai aturan yang berlaku

### ✕ Hindari
- Jangan membagikan password akun kepada siapa pun
- Jangan login di perangkat publik yang tidak aman
- Jangan mengunggah file yang berisi virus atau malware
- Jangan mencoba mengakses halaman atau fitur yang bukan hak aksesnya
- Jangan mengedit atau menghapus data yang bukan miliknya

---

## 10. Riwayat Revisi SOP
| Versi | Tanggal | Perubahan | Oleh |
|-------|---------|-----------|------|
   -         -           -       - 
