import { env } from './env.js';

/**
 * PostgreSQL connection pool configuration.
 * Centralized here so pool tuning never requires touching the
 * database service itself.
 */
export const databaseConfig = {
  connectionString: env.databaseUrl,

  // Maximum number of clients the pool may hold at once.
  max: 10,

  // Close idle clients after this many ms.
  idleTimeoutMillis: 30_000,

  // Fail fast if a connection can't be established.
  connectionTimeoutMillis: 5_000,

  // Local/internal connections (localhost, docker-compose, Railway's private
  // network) don't use SSL. External/proxied connections generally require it.
  ssl: /localhost|127\.0\.0\.1|@db:|railway\.internal/.test(env.databaseUrl)
    ? false
    : { rejectUnauthorized: false },
};
