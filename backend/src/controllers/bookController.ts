import { Request, Response } from 'express';
import pool from '../config/db';
import fs from 'fs';
import path from 'path';
import { logAction } from '../utils/logger';
import { AuthRequest } from '../middlewares/authMiddleware';

// --- FUNGSI TAMBAH BUKU ---
export const addBook = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { title, author, rak } = req.body;
        const user_id = req.user?.id;
        const ipAddress = req.ip;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!title || !author) {
            return res.status(400).json({ message: 'Judul dan Penulis wajib diisi!' });
        }

        const cover_image = files['cover'] ? files['cover'][0].filename : null;
        const file_url = files['file'] ? files['file'][0].filename : null;

        const newBook = await pool.query(
            'INSERT INTO books (title, author, cover_image, file_url, rak) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, author, cover_image, file_url, rak || null]
        );

        await logAction(user_id, 'ADD_BOOK', `Added book: ${title}`, ipAddress);
        res.status(201).json({ message: 'Buku berhasil ditambahkan', book: newBook.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan buku.' });
    }
};

// --- FUNGSI LIHAT SEMUA BUKU + SEARCH ---
export const getBooks = async (req: Request, res: Response): Promise<any> => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM books';
        let values: any[] = [];

        if (search) {
            query += ' WHERE title ILIKE $1 OR author ILIKE $1 OR rak ILIKE $1';
            values.push(`%${search}%`);
        }

        query += ' ORDER BY created_at DESC';
        const books = await pool.query(query, values);
        res.status(200).json({ data: books.rows });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data buku.' });
    }
};

// --- FUNGSI UPDATE BUKU ---
export const updateBook = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { title, author, rak } = req.body;
        const user_id = req.user?.id;
        const ipAddress = req.ip;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        // Get existing book
        const bookResult = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }

        const oldBook = bookResult.rows[0];
        let cover_image = oldBook.cover_image;
        let file_url = oldBook.file_url;

        // Handle file updates
        if (files?.['cover']) {
            // Delete old cover
            const uploadDir = path.join(process.cwd(), 'uploads');
            if (oldBook.cover_image) {
                const oldCoverPath = path.join(uploadDir, oldBook.cover_image);
                if (fs.existsSync(oldCoverPath)) fs.unlinkSync(oldCoverPath);
            }
            cover_image = files['cover'][0].filename;
        }

        if (files?.['file']) {
            // Delete old file
            const uploadDir = path.join(process.cwd(), 'uploads');
            if (oldBook.file_url) {
                const oldFilePath = path.join(uploadDir, oldBook.file_url);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            file_url = files['file'][0].filename;
        }

        // Update book
        const updatedBook = await pool.query(
            'UPDATE books SET title = $1, author = $2, cover_image = $3, file_url = $4, rak = $5 WHERE id = $6 RETURNING *',
            [title || oldBook.title, author || oldBook.author, cover_image, file_url, rak || oldBook.rak, id]
        );

        await logAction(user_id, 'UPDATE_BOOK', `Updated book ID: ${id}`, ipAddress);
        res.status(200).json({ message: 'Buku berhasil diperbarui', book: updatedBook.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memperbarui buku.' });
    }
};

// --- FUNGSI HAPUS BUKU ---
export const deleteBook = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const ipAddress = req.ip;

        const bookResult = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }

        const book = bookResult.rows[0];

        await pool.query('DELETE FROM books WHERE id = $1', [id]);

        const uploadDir = path.join(process.cwd(), 'uploads');
        if (book.cover_image) {
            const coverPath = path.join(uploadDir, book.cover_image);
            if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
        }
        if (book.file_url) {
            const filePath = path.join(uploadDir, book.file_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await logAction(user_id, 'DELETE_BOOK', `Deleted book ID: ${id}, Title: ${book.title}`, ipAddress);
        res.status(200).json({ message: 'Buku dan file fisiknya berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus buku.' });
    }
};
