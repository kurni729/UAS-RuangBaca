import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
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

  await pool.query(`
    ALTER TABLE IF EXISTS books
    ADD COLUMN IF NOT EXISTS rak VARCHAR(50);

    ALTER TABLE IF EXISTS loans
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    -- Fix the status check constraint for loans
    ALTER TABLE IF EXISTS loans
    DROP CONSTRAINT IF EXISTS loans_status_check;

    ALTER TABLE IF EXISTS loans
    ADD CONSTRAINT loans_status_check
    CHECK (status IN ('pending', 'dipinjam', 'dikembalikan'));

    -- Create logs table if it doesn't exist yet
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  schemaEnsured = true;
  console.log('Skema database diverifikasi.');
};

export default pool;
