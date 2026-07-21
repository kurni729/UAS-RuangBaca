import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { logAction } from '../utils/logger';
import XLSX from 'xlsx';

// --- Get Logs with Filters ---
export const getLogs = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { action, user_id, start_date, end_date, search } = req.query;
        const ipAddress = req.ip;
        const adminId = req.user?.id;

        // Base query
        let query = `
            SELECT logs.*, users.nim 
            FROM logs 
            LEFT JOIN users ON logs.user_id = users.id 
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        // Filter by action
        if (action) {
            query += ` AND logs.action ILIKE $${paramIndex++}`;
            params.push(`%${action}%`);
        }

        // Filter by user_id
        if (user_id) {
            query += ` AND logs.user_id = $${paramIndex++}`;
            params.push(user_id);
        }

        // Filter by start_date
        if (start_date) {
            query += ` AND logs.created_at >= $${paramIndex++}`;
            params.push(new Date(start_date as string));
        }

        // Filter by end_date
        if (end_date) {
            query += ` AND logs.created_at <= $${paramIndex++}`;
            params.push(new Date(end_date as string));
        }

        // Search by details or ip
        if (search) {
            query += ` AND (logs.details ILIKE $${paramIndex++} OR logs.ip_address ILIKE $${paramIndex++})`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Order by created_at descending
        query += ` ORDER BY logs.created_at DESC`;

        const result = await pool.query(query, params);
        
        await logAction(adminId, 'VIEW_LOGS', 'Admin viewed activity logs', ipAddress);

        res.status(200).json({ logs: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- Export All Data to Excel ---
export const exportToExcel = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const ipAddress = req.ip;
        const adminId = req.user?.id;

        // Fetch all data
        const usersResult = await pool.query('SELECT id, nim, role, is_master, created_at FROM users');
        const booksResult = await pool.query('SELECT * FROM books');
        const loansResult = await pool.query(`
            SELECT loans.*, users.nim, books.title 
            FROM loans 
            JOIN users ON loans.user_id = users.id 
            JOIN books ON loans.book_id = books.id
        `);
        const logsResult = await pool.query(`
            SELECT logs.*, users.nim 
            FROM logs 
            LEFT JOIN users ON logs.user_id = users.id
        `);

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Add users sheet
        const usersSheet = XLSX.utils.json_to_sheet(usersResult.rows);
        XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

        // Add books sheet
        const booksSheet = XLSX.utils.json_to_sheet(booksResult.rows);
        XLSX.utils.book_append_sheet(workbook, booksSheet, 'Books');

        // Add loans sheet
        const loansSheet = XLSX.utils.json_to_sheet(loansResult.rows);
        XLSX.utils.book_append_sheet(workbook, loansSheet, 'Loans');

        // Add logs sheet
        const logsSheet = XLSX.utils.json_to_sheet(logsResult.rows);
        XLSX.utils.book_append_sheet(workbook, logsSheet, 'Logs');

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ruangbaca_backup.xlsx');

        // Write workbook to response
        XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

        // Log the export action
        await logAction(adminId, 'EXPORT_DATA', 'Admin exported all data to Excel', ipAddress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};
