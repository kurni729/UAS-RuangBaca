# RuangBaca - Perpustakaan Digital (UAS Ethical Hacking)

Sistem perpustakaan digital dengan komponen keamanan lengkap untuk Ujian Akhir Semester Ethical Hacking.

---

## Fitur Utama

### Admin
- Login
- Menambah, mengedit, menghapus buku (dengan cover dan file PDF)
- Melihat katalog buku
- Melihat dan mengkonfirmasi permintaan peminjaman
- Melihat dan mengkonfirmasi pengembalian buku
- Melihat semua riwayat peminjaman
- Mengelola pengguna (tambah, hapus)

### Pengguna
- Login
- Melihat katalog buku
- Meminjam buku
- Melihat riwayat peminjaman pribadi

---

## Stack Teknologi

### Frontend
- React 19 + TypeScript
- Vite (Build Tool)
- Tailwind CSS (Styling)
- React Router (Routing)
- Axios (API Client)
- React Hot Toast (Notifikasi)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL (Database)
- Multer (File Upload)
- bcrypt (Password Hashing)
- jsonwebtoken (JWT Authentication)
- Helmet (Security Headers)
- CORS (Cross-Origin Resource Sharing)
- Express Rate Limit (Rate Limiting)

---

## Komponen Keamanan Wajib (Sesuai Rubrik UAS)

| # | Komponen Keamanan | Implementasi | Lokasi File |
|---|--------------------|--------------|-------------|
| 1 | Autentikasi Kuat | Password di-hash dengan bcrypt (salt 12), rate limiting 100 req/15 menit | [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts#L46), [app.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/app.ts#L29-L34) |
| 2 | Otorisasi / RBAC | 2 peran (Admin & User), middleware verifikasi token & role di setiap request | [authMiddleware.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/middlewares/authMiddleware.ts), [routes/*](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/routes) |
| 3 | Manajemen Session | Autentikasi berbasis JWT | [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts#L89-L94), [api.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/frontend/src/services/api.ts#L21-L30) |
| 4 | Validasi & Sanitasi Input | Query parameterized (pg package) untuk mencegah SQL Injection | [bookController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/bookController.ts), [loanController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/loanController.ts), [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts) |
| 5 | Proteksi Upload File | Filter tipe file (cover: jpg/png, file: pdf), ganti nama file random, batas ukuran 10MB | [uploadMiddleware.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/middlewares/uploadMiddleware.ts) |
| 6 | Error Handling + Security Headers | Helmet dengan CSP, X-Frame-Options, dll; pesan error aman (tidak bocor stack trace/query) | [app.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/app.ts#L14-L27), [controllers/*](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers) |
| 7 | Proteksi Data Sensitif | Password di-hash, tidak pernah ditampilkan di frontend | [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts) |
| 8 | Logging & Monitoring | Tabel `logs` untuk mencatat aktivitas penting (login, aksi admin, upload, dll) | [logger.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/utils/logger.ts), [config/db.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/config/db.ts#L40-L48) |
| 9 | Dependency Management | `package.json` di backend dan frontend mencatat semua dependensi beserta versinya | [backend/package.json](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/package.json), [frontend/package.json](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/frontend/package.json) |

---

## Setup Awal

### Prasyarat
- Node.js (v18 atau lebih baru)
- PostgreSQL (v13 atau lebih baru)
- npm

### Langkah-langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd uas-perpustakaan-digital
   ```

2. **Setup Database**
   - Buat database baru di PostgreSQL dengan nama `perpustakaan_db`
   - Jalankan file `backend/sql/schema.sql` untuk membuat tabel dan data awal
     ```bash
     psql -U postgres -d perpustakaan_db -f backend/sql/schema.sql
     ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```
   - Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi database jika perlu
   - Jalankan backend:
     ```bash
     npm run dev
     ```
     Backend akan berjalan di `http://localhost:5000`

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend akan berjalan di `http://localhost:5173`

---

## Akun Awal

Setelah menjalankan `schema.sql`, kamu bisa login dengan akun berikut:

- **Admin**:
  - NIM: `111111`
  - Password: `Admin123`

- **Pengguna**:
  - NIM: `222222`
  - Password: `User1234`

---

## Struktur Folder

```
uas-perpustakaan-digital/
├── backend/
│   ├── src/
│   │   ├── config/         # Konfigurasi database
│   │   ├── controllers/    # Logika bisnis (auth, books, loans)
│   │   ├── middlewares/    # Middleware (auth, upload)
│   │   ├── routes/         # Rute API
│   │   ├── utils/          # Utilitas (logger)
│   │   └── app.ts          # Entry point backend
│   ├── sql/                # File SQL untuk setup database
│   ├── uploads/            # Folder untuk menyimpan file yang diupload
│   ├── .env.example        # Template environment variable
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── assets/         # Asset gambar
    │   ├── components/     # Komponen reusable (ProtectedRoute, AdminRoute)
    │   ├── pages/          # Halaman aplikasi
    │   ├── services/       # API service
    │   ├── App.tsx
    │   └── main.tsx
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## Catatan Tambahan

- Aplikasi ini sudah memiliki **auto-migrate sederhana** di `db.ts` untuk memverifikasi dan menambah kolom yang hilang saat startup.
- Untuk scan dependensi, kamu bisa menjalankan `npm audit` di folder `backend` dan `frontend`.

---

## Fitur Nilai Plus (Opsional Sesuai Rubrik UAS)

Berikut fitur tambahan untuk meningkatkan keamanan aplikasi:

1. **Password Policy**: Registrasi pengguna baru memerlukan password dengan minimal 8 karakter, kombinasi huruf besar, huruf kecil, dan angka. Diimplementasikan di [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts#L11-L24).
2. **HttpOnly SameSite Cookie**: Token autentikasi disimpan sebagai HttpOnly Cookie dengan SameSite Strict, sehingga lebih aman dari XSS dan CSRF. Diimplementasikan di [authController.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/backend/src/controllers/authController.ts#L114-L121) dan [api.ts](file:///c:/myappp/UAS%20Parisqa/uas-perpustakaan-digital/frontend/src/services/api.ts#L8).
3. **0 Vulnerabilities dari npm audit**: Hasil scan npm audit menunjukkan 0 vulnerabilities di kedua backend dan frontend.
