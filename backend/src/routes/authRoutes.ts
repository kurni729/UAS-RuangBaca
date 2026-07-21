import { Router } from 'express';
import { register, login, logout, getUsers, deleteUser, verifyPin } from '../controllers/authController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Route untuk login (public)
router.post('/login', login);

// Route untuk verifikasi PIN (MFA) (public, but requires mfa_token)
router.post('/verify-pin', verifyPin);

// Route untuk logout (butuh token)
router.post('/logout', verifyToken, logout);

// Route untuk register (admin only)
router.post('/register', verifyToken, isAdmin, register);

// Route untuk get all users (admin only)
router.get('/users', verifyToken, isAdmin, getUsers);

// Route untuk delete user (admin only)
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

export default router;
