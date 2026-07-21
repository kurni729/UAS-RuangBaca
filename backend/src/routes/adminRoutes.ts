import { Router } from 'express';
import { getLogs, exportToExcel } from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Route to get logs (admin only)
router.get('/logs', verifyToken, isAdmin, getLogs);

// Route to export data to Excel (admin only)
router.get('/export', verifyToken, isAdmin, exportToExcel);

export default router;
