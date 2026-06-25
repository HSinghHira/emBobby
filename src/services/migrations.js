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
 *
 * ── Verification Module Tables ─────────────────────────────────
 *   verified_users   – Stores OAuth2 tokens and Discord IDs for
 *                      users who completed OAuth2 verification.
 *                      Guild-anchored so each server owns its own
 *                      verified-member registry.
 *
 * ── Backup Module Tables ───────────────────────────────────────
 *   server_backups   – Stores serialised server layouts (channels,
 *                      categories, roles, permissions) alongside
 *                      OAuth2 tokens so /clone can recreate the
 *                      source server on a fresh guild.
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

  // ── Verification: verified users ─────────────────────────────
  `
  CREATE TABLE IF NOT EXISTS verified_users (
    id              SERIAL PRIMARY KEY,
    guild_id        TEXT NOT NULL,
    discord_id      TEXT NOT NULL,
    oauth2_token    TEXT NOT NULL,
    oauth2_refresh  TEXT,
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (guild_id, discord_id)
  );
  `,

  // Index for fast guild-scoped lookups
  `
  CREATE INDEX IF NOT EXISTS idx_verified_users_guild
    ON verified_users (guild_id);
  `,

  // ── Backup: server layout snapshots ──────────────────────────
  `
  CREATE TABLE IF NOT EXISTS server_backups (
    id              SERIAL PRIMARY KEY,
    source_guild_id TEXT NOT NULL UNIQUE,
    backup_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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