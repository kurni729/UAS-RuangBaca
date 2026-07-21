import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { logAction } from '../utils/logger';
import { AuthRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 10;

// Helper: Get login attempt by IP (and reset if lock expired)
const getLoginAttempt = async (ipAddress: string) => {
  const result = await pool.query(
    'SELECT * FROM login_attempts WHERE ip_address = $1',
    [ipAddress]
  );
  const attempt = result.rows[0] || null;
  
  // If lock has expired, reset attempt count and lock
  if (attempt && attempt.locked_until && new Date(attempt.locked_until) <= new Date()) {
    await pool.query(
      'UPDATE login_attempts SET attempt_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE ip_address = $1',
      [ipAddress]
    );
    return { ...attempt, attempt_count: 0, locked_until: null };
  }
  
  return attempt;
};

// Helper: Increment login attempt
const incrementLoginAttempt = async (ipAddress: string) => {
  let existing = await getLoginAttempt(ipAddress);
  
  if (!existing) {
    // First attempt: create new record
    await pool.query(
      'INSERT INTO login_attempts (ip_address, attempt_count) VALUES ($1, 1)',
      [ipAddress]
    );
    return { attempt_count: 1, locked_until: null };
  }

  // Check if already locked
  if (existing.locked_until && new Date(existing.locked_until) > new Date()) {
    return existing;
  }

  // Increment attempt count
  const newAttemptCount = existing.attempt_count + 1;
  let lockedUntil = null;

  if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }

  await pool.query(
    `UPDATE login_attempts 
     SET attempt_count = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE ip_address = $3`,
    [newAttemptCount, lockedUntil, ipAddress]
  );

  return { attempt_count: newAttemptCount, locked_until: lockedUntil };
};

// Helper: Reset login attempt after successful login
const resetLoginAttempt = async (ipAddress: string) => {
  await pool.query(
    'UPDATE login_attempts SET attempt_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE ip_address = $1',
    [ipAddress]
  );
};

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
        const { nim, password, role, pin } = req.body;
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

        // 4. Validasi PIN untuk admin
        if (role === 'admin') {
            if (!pin || !/^\d{6}$/.test(pin)) {
                return res.status(400).json({ message: 'PIN harus 6 digit angka untuk admin!' });
            }
        }

        // 5. Password Policy Check
        const passwordCheck = isPasswordStrong(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ message: passwordCheck.message });
        }

        // 6. Cek apakah NIM sudah terdaftar
        const userExist = await pool.query('SELECT * FROM users WHERE nim = $1', [nim]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'NIM sudah terdaftar!' });
        }

        // 7. Hashing password dan PIN (jika admin) menggunakan bcrypt (OWASP Recommended)
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        let hashedPin = null;
        if (role === 'admin' && pin) {
            hashedPin = await bcrypt.hash(pin, saltRounds);
        }

        // 8. Simpan ke database
        const newUser = await pool.query(
            'INSERT INTO users (nim, password, role, pin) VALUES ($1, $2, $3, $4) RETURNING id, nim, role',
            [nim, hashedPassword, role, hashedPin]
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

        // 0. Cek apakah IP sedang terkunci
        const existingAttempt = await getLoginAttempt(ipAddress);
        if (existingAttempt && existingAttempt.locked_until && new Date(existingAttempt.locked_until) > new Date()) {
            const timeLeftMs = new Date(existingAttempt.locked_until).getTime() - Date.now();
            const timeLeftMinutes = Math.ceil(timeLeftMs / (1000 * 60));
            return res.status(429).json({ 
                message: `Terlalu banyak percobaan login yang salah! Silakan coba lagi dalam ${timeLeftMinutes} menit.` 
            });
        }

        // 1. Cari user berdasarkan NIM
        const userResult = await pool.query('SELECT * FROM users WHERE nim = $1', [nim]);
        if (userResult.rows.length === 0) {
            // Increment attempt count
            await incrementLoginAttempt(ipAddress);
            await logAction(null, 'FAILED_LOGIN', `Failed login attempt for NIM: ${nim}`, ipAddress);
            return res.status(401).json({ message: 'NIM atau password salah!' });
        }

        const user = userResult.rows[0];

        // 2. Verifikasi kesesuaian password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Increment attempt count
            const newAttempt = await incrementLoginAttempt(ipAddress);
            const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempt.attempt_count;
            
            await logAction(user.id, 'FAILED_LOGIN', `Invalid password for NIM: ${nim}`, ipAddress);
            
            let errorMessage = 'NIM atau password salah!';
            if (attemptsLeft > 0) {
                errorMessage += ` Anda memiliki ${attemptsLeft} percobaan lagi.`;
            } else {
                errorMessage += ` Akun Anda terkunci selama ${LOCKOUT_DURATION_MINUTES} menit.`;
            }
            
            return res.status(401).json({ message: errorMessage });
        }

        // 3. Jika user adalah admin dan memiliki PIN, berikan mfa_token untuk verifikasi PIN
        if (user.role === 'admin' && user.pin) {
            await logAction(user.id, 'MFA_REQUIRED', 'Admin login successful, PIN verification required', ipAddress);
            
            // Buat temporary MFA token (berlaku 5 menit)
            const mfaToken = jwt.sign(
                { id: user.id, nim: user.nim, role: user.role, type: 'mfa' }, 
                JWT_SECRET, 
                { expiresIn: '5m' }
            );

            return res.status(200).json({
                message: 'Login berhasil! Silakan verifikasi PIN Anda.',
                mfa_required: true,
                mfa_token: mfaToken,
                user: { id: user.id, nim: user.nim, role: user.role }
            });
        }

        // 4. Reset login attempt setelah login berhasil
        await resetLoginAttempt(ipAddress);

        // 5. Buat JSON Web Token (JWT) untuk user biasa
        const token = jwt.sign(
            { id: user.id, nim: user.nim, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 6. Kirim token di response body (untuk user biasa)
        await logAction(user.id, 'SUCCESS_LOGIN', 'User logged in', ipAddress);

        res.status(200).json({
            message: 'Login berhasil!',
            mfa_required: false,
            token: token,
            user: { id: user.id, nim: user.nim, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- FUNGSI VERIFIKASI PIN (MFA) ---
export const verifyPin = async (req: Request, res: Response): Promise<any> => {
    try {
        const { mfa_token, pin } = req.body;
        const ipAddress = req.ip;

        // 0. Cek apakah IP sedang terkunci
        const existingAttempt = await getLoginAttempt(ipAddress);
        if (existingAttempt && existingAttempt.locked_until && new Date(existingAttempt.locked_until) > new Date()) {
            const timeLeftMs = new Date(existingAttempt.locked_until).getTime() - Date.now();
            const timeLeftMinutes = Math.ceil(timeLeftMs / (1000 * 60));
            await logAction(null, 'FAILED_MFA', `Locked out attempt from IP: ${ipAddress}`, ipAddress);
            return res.status(429).json({ 
                message: `Terlalu banyak percobaan yang salah! Silakan coba lagi dalam ${timeLeftMinutes} menit.` 
            });
        }

        // 1. Verifikasi MFA token
        let decoded;
        try {
            decoded = jwt.verify(mfa_token, JWT_SECRET) as any;
            if (decoded.type !== 'mfa') {
                return res.status(401).json({ message: 'Token MFA tidak valid!' });
            }
        } catch (error) {
            await logAction(null, 'FAILED_MFA', 'Invalid or expired MFA token', ipAddress);
            return res.status(401).json({ message: 'Token MFA tidak valid atau sudah kadaluarsa!' });
        }

        // 2. Cari user berdasarkan ID dari token
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            await logAction(null, 'FAILED_MFA', 'User not found for MFA', ipAddress);
            return res.status(401).json({ message: 'User tidak ditemukan!' });
        }

        const user = userResult.rows[0];

        // 3. Validasi PIN (6 digit)
        if (!pin || !/^\d{6}$/.test(pin)) {
            await logAction(user.id, 'FAILED_MFA', 'Invalid PIN format', ipAddress);
            return res.status(400).json({ message: 'PIN harus berupa 6 digit angka!' });
        }

        // 4. Verifikasi PIN
        const isPinMatch = await bcrypt.compare(pin, user.pin);
        if (!isPinMatch) {
            // Increment attempt count
            const newAttempt = await incrementLoginAttempt(ipAddress);
            const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempt.attempt_count;
            
            await logAction(user.id, 'FAILED_MFA', `Invalid PIN for admin: ${user.nim}`, ipAddress);
            
            let errorMessage = 'PIN salah!';
            if (attemptsLeft > 0) {
                errorMessage += ` Anda memiliki ${attemptsLeft} percobaan lagi.`;
            } else {
                errorMessage += ` Akun Anda terkunci selama ${LOCKOUT_DURATION_MINUTES} menit.`;
            }
            
            return res.status(401).json({ message: errorMessage });
        }

        // 5. Reset login attempt setelah PIN berhasil
        await resetLoginAttempt(ipAddress);

        // 6. Buat JWT token utama
        const token = jwt.sign(
            { id: user.id, nim: user.nim, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 7. Log successful MFA
        await logAction(user.id, 'SUCCESS_MFA', 'Admin PIN verified successfully', ipAddress);

        res.status(200).json({
            message: 'Verifikasi PIN berhasil!',
            token: token,
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
        // Catat log logout
        const ipAddress = req.ip;
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                await logAction(decoded.id, 'SUCCESS_LOGOUT', 'User logged out', ipAddress);
            } catch (e) {
                // Token tidak valid, tidak perlu log
            }
        }
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

        if (parseInt(id as string) === user_id) {
            return res.status(400).json({ message: 'Anda tidak bisa menghapus akun sendiri!' });
        }

        // Cek apakah user yang akan dihapus adalah admin master
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan!' });
        }

        if (userResult.rows[0].is_master) {
            await logAction(user_id || null, 'FAILED_DELETE_USER', 'Attempt to delete master admin', ipAddress);
            return res.status(403).json({ message: 'Anda tidak bisa menghapus akun admin master!' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await logAction(user_id, 'DELETE_USER', `Deleted user ID: ${id}`, ipAddress);
        res.status(200).json({ message: 'User berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};
