import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pool, { ensureDatabaseSchema } from './config/db';
import authRoutes from './routes/authRoutes';
import bookRoutes from './routes/bookRoutes'; 
import path from 'path'; 
import loanRoutes from './routes/loanRoutes';
import multer from 'multer';

const app = express();

// --- 1. MIDDLEWARE KEAMANAN (Merujuk pada OWASP & Syarat UAS Komponen #1 & #6) ---
// Helmet: Menambahkan security headers (CSP, X-Frame-Options, dll)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000", "https://lh3.googleusercontent.com", "https://books.google.com", "https://*.googleusercontent.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:5000"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Agar gambar upload tidak ditolak oleh browser
}));

// Rate Limiting: Mencegah serangan Brute Force / DDoS (Maks 100 request per 15 menit per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.'
});
app.use(limiter);

// --- 2. MIDDLEWARE STANDAR ---
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://uas-ruang-baca.vercel.app'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser()); // Agar bisa menerima input data berformat JSON
// --- MEMBUKA AKSES FOLDER UPLOADS KE PUBLIK ---
// Mengizinkan file di folder uploads dapat diakses dengan URL http://localhost:5000/uploads/namafile.png
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 3. ROUTE PENGUJIAN KONEKSI DATABASE ---
app.get('/api/test-db', async (req, res) => {
    try {
        // Mencoba mengambil waktu saat ini dari PostgreSQL
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({ 
            success: true, 
            message: 'Koneksi Server & Database PostgreSQL berhasil!',
            db_time: result.rows[0].now 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database gagal terhubung.' });
    }
});

// --- ROUTE UTAMA ---
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);

// --- MIDDLEWARE PENANGANAN ERROR MULTER ---
app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Kesalahan upload: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
});

// --- 4. MENJALANKAN SERVER ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await ensureDatabaseSchema();
        app.listen(PORT, () => {
            console.log(`Server Backend berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Gagal memulai server karena verifikasi skema database gagal:', error);
        process.exit(1);
    }
};

startServer();
