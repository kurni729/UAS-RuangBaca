import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
    // Baca token dari cookie auth_token
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak! Token tidak ditemukan atau format salah.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Sesi tidak valid atau token telah kedaluwarsa!' });
    }
};

// --- 2. MIDDLEWARE: CEK ROLE ADMIN (RBAC - Role Based Access Control) ---
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): any => {
    // Memastikan middleware verifyToken sudah dijalankan sebelumnya
    if (!req.user) {
        return res.status(401).json({ message: 'Harap verifikasi token terlebih dahulu.' });
    }

    // Mengecek apakah role user adalah admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Akses ditolak! Halaman ini hanya untuk Admin.' });
    }

    next(); // Lolos, user terbukti sebagai Admin
};