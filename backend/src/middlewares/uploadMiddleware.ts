import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Pastikan direktori uploads ada
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan dan sanitasi nama file (Standar OWASP)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Menyimpan file ke folder uploads
    },
    filename: (req, file, cb) => {
        // Mengganti nama file dengan 16 byte string acak (Mencegah Path Traversal)
        const randomString = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${randomString}${ext}`);
    }
});

// Filter jenis file (File Type Validation)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.fieldname === 'cover') {
        const allowedCoverMime = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedCoverMime.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Keamanan: Format cover ditolak. Hanya izinkan JPG/PNG.'));
        }
    } else if (file.fieldname === 'file') {
        const allowedEbookMime = ['application/pdf'];
        if (allowedEbookMime.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Keamanan: Format dokumen ditolak. Hanya izinkan PDF.'));
        }
    } else {
        cb(new Error('Field upload tidak dikenali.'));
    }
};

// Ekspor middleware dengan batasan ukuran 10MB (Mencegah DoS Storage)
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Maksimal 10 MB
    }
});