import { Router } from 'express';
import { borrowBook, confirmLoan, confirmReturn, getLoans } from '../controllers/loanController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Request pinjam buku (user)
router.post('/', verifyToken, borrowBook);

// Konfirmasi pinjaman (admin)
router.put('/:id/confirm', verifyToken, isAdmin, confirmLoan);

// Konfirmasi pengembalian (admin)
router.put('/:id/return', verifyToken, isAdmin, confirmReturn);

// Lihat riwayat (user lihat sendiri, admin lihat semua)
router.get('/', verifyToken, getLoans);

export default router;
