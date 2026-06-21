import { query } from './database.js';
import { logger } from '../shared/logger.js';

/**
 * Schema definitions, run idempotently on every startup.
 *
 * `guild_settings` stores one row per Discord server. Genuinely global,
 * frequently-read fields are plain columns (guild_name, locale, timezone,
 * embed_color). Everything module-specific (logging, welcome, tickets,
 * voice, etc.) lives inside the `settings` JSONB column, namespaced by
 * module key — e.g. settings.logging.channelId, settings.welcome.message.
 *
 * This means future modules can read/write their own settings without
 * ever requiring a schema migration or touching this file.
 */
const STATEMENTS = [
  `
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id     TEXT PRIMARY KEY,
    guild_name   TEXT,
    owner_id     TEXT,
    locale       TEXT NOT NULL DEFAULT 'en-US',
    timezone     TEXT NOT NULL DEFAULT 'UTC',
    embed_color  INTEGER NOT NULL DEFAULT 5793266,
    settings     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  `,
];

/**
 * Runs all schema statements in order. Safe to call on every startup —
 * every statement uses IF NOT EXISTS / idempotent guards.
 */
export async function runMigrations() {
  for (const statement of STATEMENTS) {
    await query(statement);
  }

  logger.success('Database schema is up to date.');
}
