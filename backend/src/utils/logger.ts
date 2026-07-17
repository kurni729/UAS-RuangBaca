import pool from '../config/db';

export const logAction = async (userId: number | null, action: string, details?: string, ipAddress?: string) => {
  try {
    await pool.query(
      'INSERT INTO logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, action, details || null, ipAddress || null]
    );
  } catch (error: any) {
    // Ignore errors if logs table doesn't exist yet
    if (error.code !== '42P01') { // 42P01 is "relation does not exist" in PostgreSQL
      console.error('Failed to log action:', error);
    }
  }
};
