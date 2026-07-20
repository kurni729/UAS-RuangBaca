import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432'),
    });

pool.on('connect', () => {
  console.log('Koneksi ke database PostgreSQL berhasil!');
});

let schemaEnsured = false;

export const ensureDatabaseSchema = async () => {
  if (schemaEnsured) {
    return;
  }

  // Baca dan jalankan schema.sql
  const schemaPath = path.join(__dirname, '../../sql/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Eksekusi schema.sql
  await pool.query(schemaSql);

  // Migrasi: Tambahkan kolom is_master jika belum ada
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE');
    console.log('Kolom is_master berhasil ditambahkan (jika belum ada).');
  } catch (error) {
    console.log('Kolom is_master sudah ada.');
  }

  // Set akun admin default (111111) menjadi master
  try {
    await pool.query("UPDATE users SET is_master = TRUE WHERE nim = '111111'");
    console.log('Akun admin master berhasil diatur.');
  } catch (error) {
    console.log('Gagal mengatur akun admin master:', error);
  }

  schemaEnsured = true;
  console.log('Skema database berhasil dibuat.');
};

export default pool;
