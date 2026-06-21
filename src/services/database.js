import { Pool } from 'pg';
import { databaseConfig } from '../config/database.js';
import { logger } from '../shared/logger.js';
import { DatabaseError } from '../shared/errors.js';

export const pool = new Pool(databaseConfig);

// Idle clients shouldn't crash the process if Postgres drops the connection.
pool.on('error', (error) => {
  logger.error('Unexpected error on idle database client.', error);
});

/**
 * Runs a single query against the pool.
 * Use this for one-off statements that don't need an explicit transaction.
 */
export async function query(text, params) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    logger.debug(`Query executed in ${Date.now() - start}ms`, { text });
    return result;
  } catch (error) {
    throw new DatabaseError(`Query failed: ${text}`, error);
  }
}

/**
 * Runs a callback within a single transaction. The callback receives a
 * client with the same `query` interface, scoped to that transaction.
 * Automatically commits on success and rolls back on error.
 *
 * Example:
 *   await transaction(async (client) => {
 *     await client.query('INSERT INTO ...');
 *     await client.query('UPDATE ...');
 *   });
 */
export async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new DatabaseError('Transaction failed and was rolled back.', error);
  } finally {
    client.release();
  }
}

/**
 * Verifies the database connection is alive. Throws if it can't connect.
 * Called once at startup.
 */
export async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

/**
 * Lightweight check for use in health checks/monitoring.
 * Returns true/false instead of throwing.
 */
export async function isDatabaseHealthy() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Closes all pool connections. Called during graceful shutdown.
 */
export async function closeDatabase() {
  await pool.end();
  logger.info('Database pool closed.');
}
