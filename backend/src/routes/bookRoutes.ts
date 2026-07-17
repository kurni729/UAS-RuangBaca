import { Router } from 'express';
import { addBook, getBooks, deleteBook, updateBook } from '../controllers/bookController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Tambah buku (admin)
router.post(
    '/', 
    verifyToken, 
    isAdmin, 
    upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }]), 
    addBook
);

// Update buku (admin)
router.put(
    '/:id', 
    verifyToken, 
    isAdmin, 
    upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }]), 
    updateBook
);

// Lihat semua buku (semua role)
router.get('/', verifyToken, getBooks);

// Hapus buku (admin)
router.delete('/:id', verifyToken, isAdmin, deleteBook);

export default router;
