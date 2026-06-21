import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

/**
 * Verifies the database connection is alive.
 * Throws if the connection cannot be established.
 */
export async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
