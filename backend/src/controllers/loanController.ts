import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { logAction } from '../utils/logger';

// --- FUNGSI PINJAM BUKU (User request pending) ---
export const borrowBook = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { book_id } = req.body;
        const user_id = req.user?.id;
        const ipAddress = req.ip;

        if (!book_id) {
            return res.status(400).json({ message: 'ID Buku wajib diisi!' });
        }

        const bookCheck = await pool.query('SELECT id FROM books WHERE id = $1', [book_id]);
        if (bookCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }

        const loanCheck = await pool.query(
            "SELECT id FROM loans WHERE user_id = $1 AND book_id = $2 AND status IN ('pending', 'dipinjam')",
            [user_id, book_id]
        );
        if (loanCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Anda memiliki permintaan atau masih meminjam buku ini!' });
        }

        const newLoan = await pool.query(
            'INSERT INTO loans (user_id, book_id, status) VALUES ($1, $2, $3) RETURNING *',
            [user_id, book_id, 'pending']
        );

        await logAction(user_id, 'REQUEST_BORROW', `Requested to borrow book ID: ${book_id}`, ipAddress);
        res.status(201).json({ message: 'Permintaan pinjaman berhasil dikirim! Tunggu konfirmasi admin.', loan: newLoan.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal meminjam buku.' });
    }
};

// --- FUNGSI ADMIN KONFIRMASI PINJAMAN ---
export const confirmLoan = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const user_role = req.user?.role;
        const ipAddress = req.ip;

        if (user_role !== 'admin') {
            await logAction(user_id || null, 'FAILED_CONFIRM_LOAN', 'Unauthorized attempt', ipAddress);
            return res.status(403).json({ message: 'Akses ditolak!' });
        }

        const loanCheck = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Data peminjaman tidak ditemukan.' });
        }

        const loan = loanCheck.rows[0];
        if (loan.status !== 'pending') {
            return res.status(400).json({ message: 'Status peminjaman bukan pending!' });
        }

        const updatedLoan = await pool.query(
            "UPDATE loans SET status = 'dipinjam', borrow_date = CURRENT_DATE WHERE id = $1 RETURNING *",
            [id]
        );

        await logAction(user_id, 'CONFIRM_LOAN', `Confirmed loan ID: ${id}`, ipAddress);
        res.status(200).json({ message: 'Peminjaman berhasil dikonfirmasi!', loan: updatedLoan.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengkonfirmasi peminjaman.' });
    }
};

// --- FUNGSI REQUEST PENGEMBALIAN (User) ---
export const requestReturn = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const ipAddress = req.ip;

        const loanCheck = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Data peminjaman tidak ditemukan.' });
        }

        const loan = loanCheck.rows[0];
        if (loan.user_id !== user_id) {
            return res.status(403).json({ message: 'Akses ditolak!' });
        }

        if (loan.status !== 'dipinjam') {
            return res.status(400).json({ message: 'Buku tidak sedang dipinjam!' });
        }

        // For simplicity, we'll use 'pending_return' as a status, but let's just let admin mark as returned directly
        // Or we can add another status, but let's keep it simple for now
        res.status(200).json({ message: 'Silakan hubungi admin untuk mengkonfirmasi pengembalian.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memproses permintaan.' });
    }
};

// --- FUNGSI ADMIN KONFIRMASI PENGEMBALIAN ---
export const confirmReturn = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const user_role = req.user?.role;
        const ipAddress = req.ip;

        if (user_role !== 'admin') {
            await logAction(user_id || null, 'FAILED_CONFIRM_RETURN', 'Unauthorized attempt', ipAddress);
            return res.status(403).json({ message: 'Akses ditolak!' });
        }

        const loanCheck = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (loanCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Data peminjaman tidak ditemukan.' });
        }

        const loan = loanCheck.rows[0];
        if (loan.status !== 'dipinjam') {
            return res.status(400).json({ message: 'Buku tidak sedang dipinjam!' });
        }

        const updatedLoan = await pool.query(
            "UPDATE loans SET status = 'dikembalikan', return_date = CURRENT_DATE WHERE id = $1 RETURNING *",
            [id]
        );

        await logAction(user_id, 'CONFIRM_RETURN', `Confirmed return for loan ID: ${id}`, ipAddress);
        res.status(200).json({ message: 'Pengembalian berhasil dikonfirmasi!', loan: updatedLoan.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengkonfirmasi pengembalian.' });
    }
};

// --- FUNGSI LIHAT RIWAYAT PEMINJAMAN ---
export const getLoans = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const user_id = req.user?.id;
        const user_role = req.user?.role;

        let query = `
            SELECT l.id, l.borrow_date, l.return_date, l.status, 
                   u.nim, b.title, b.author, b.cover_image, b.rak 
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
        `;
        let values: any[] = [];

        if (user_role !== 'admin') {
            query += ' WHERE l.user_id = $1';
            values.push(user_id);
        }

        query += ' ORDER BY l.created_at DESC';

        const loans = await pool.query(query, values);
        res.status(200).json({ data: loans.rows });
    } catch (error) {
        console.error('Gagal mengambil data peminjaman:', error);
        res.status(500).json({ message: 'Gagal mengambil data peminjaman.' });
    }
};
