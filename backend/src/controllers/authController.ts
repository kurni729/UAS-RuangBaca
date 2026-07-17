import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { logAction } from '../utils/logger';
import { AuthRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// --- Password Policy Helper ---
const isPasswordStrong = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
        return { valid: false, message: 'Password harus minimal 8 karakter!' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung huruf kecil!' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung huruf besar!' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung angka!' };
    }
    return { valid: true, message: '' };
};

// --- FUNGSI REGISTRASI (HANYA ADMIN) ---
export const register = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { nim, password, role } = req.body;
        const user_id = req.user?.id;
        const user_role = req.user?.role;
        const ipAddress = req.ip;

        // 1. Otorisasi: Hanya admin yang bisa mendaftarkan user
        if (user_role !== 'admin') {
            await logAction(user_id || null, 'FAILED_REGISTER', 'Unauthorized attempt to register user', ipAddress);
            return res.status(403).json({ message: 'Akses ditolak! Hanya admin yang bisa mendaftarkan pengguna.' });
        }

        // 2. Validasi input dasar
        if (!nim || !password || !role) {
            return res.status(400).json({ message: 'Semua kolom (NIM, password, role) wajib diisi!' });
        }

        // 3. Validasi role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Role harus admin atau user!' });
        }

        // 4. Password Policy Check
        const passwordCheck = isPasswordStrong(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ message: passwordCheck.message });
        }

        // 5. Cek apakah NIM sudah terdaftar
        const userExist = await pool.query('SELECT * FROM users WHERE nim = $1', [nim]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'NIM sudah terdaftar!' });
        }

        // 6. Hashing password menggunakan bcrypt (OWASP Recommended)
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 7. Simpan ke database
        const newUser = await pool.query(
            'INSERT INTO users (nim, password, role) VALUES ($1, $2, $3) RETURNING id, nim, role',
            [nim, hashedPassword, role]
        );

        await logAction(user_id, 'REGISTER_USER', `Registered user ${nim} as ${role}`, ipAddress);

        res.status(201).json({ 
            message: 'Registrasi berhasil!', 
            user: newUser.rows[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- FUNGSI LOGIN ---
export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { nim, password } = req.body;
        const ipAddress = req.ip;

        // 1. Cari user berdasarkan NIM
        const userResult = await pool.query('SELECT * FROM users WHERE nim = $1', [nim]);
        if (userResult.rows.length === 0) {
            await logAction(null, 'FAILED_LOGIN', `Failed login attempt for NIM: ${nim}`, ipAddress);
            return res.status(401).json({ message: 'NIM atau password salah!' });
        }

        const user = userResult.rows[0];

        // 2. Verifikasi kesesuaian password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await logAction(user.id, 'FAILED_LOGIN', `Invalid password for NIM: ${nim}`, ipAddress);
            return res.status(401).json({ message: 'NIM atau password salah!' });
        }

        // 3. Buat JSON Web Token (JWT)
        const token = jwt.sign(
            { id: user.id, nim: user.nim, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 4. Set token sebagai HttpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Gunakan HTTPS di produksi
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 jam
            path: '/'
        });

        await logAction(user.id, 'SUCCESS_LOGIN', 'User logged in', ipAddress);

        res.status(200).json({
            message: 'Login berhasil!',
            user: { id: user.id, nim: user.nim, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- FUNGSI LOGOUT ---
export const logout = async (req: Request, res: Response): Promise<any> => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        res.status(200).json({ message: 'Logout berhasil!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- FUNGSI GET ALL USERS (HANYA ADMIN) ---
export const getUsers = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const user_id = req.user?.id;
        const user_role = req.user?.role;
        const ipAddress = req.ip;

        if (user_role !== 'admin') {
            await logAction(user_id || null, 'FAILED_GET_USERS', 'Unauthorized attempt to get users', ipAddress);
            return res.status(403).json({ message: 'Akses ditolak!' });
        }

        const users = await pool.query('SELECT id, nim, role, created_at FROM users ORDER BY created_at DESC');
        await logAction(user_id, 'GET_USERS', 'Fetched all users', ipAddress);
        res.status(200).json({ data: users.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- FUNGSI DELETE USER (HANYA ADMIN) ---
export const deleteUser = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const user_role = req.user?.role;
        const ipAddress = req.ip;

        if (user_role !== 'admin') {
            await logAction(user_id || null, 'FAILED_DELETE_USER', 'Unauthorized attempt to delete user', ipAddress);
            return res.status(403).json({ message: 'Akses ditolak!' });
        }

        if (parseInt(id) === user_id) {
            return res.status(400).json({ message: 'Anda tidak bisa menghapus akun sendiri!' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan!' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await logAction(user_id, 'DELETE_USER', `Deleted user ID: ${id}`, ipAddress);
        res.status(200).json({ message: 'User berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};
