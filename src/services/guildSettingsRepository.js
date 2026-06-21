import { query } from './database.js';

/**
 * Raw data access for the `guild_settings` table.
 * No caching, no defaults, no business rules — that belongs in
 * guildConfigService.js. This file only knows how to talk to Postgres.
 */

const COLUMN_WHITELIST = ['guild_name', 'owner_id', 'locale', 'timezone', 'embed_color'];

export async function findByGuildId(guildId) {
  const result = await query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
  return result.rows[0] ?? null;
}

/**
 * Inserts a new row if one doesn't already exist. Returns the resulting
 * row either way (existing or newly created).
 */
export async function insertIfMissing(guildId, { guildName = null, ownerId = null } = {}) {
  const result = await query(
    `
    INSERT INTO guild_settings (guild_id, guild_name, owner_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id) DO NOTHING
    RETURNING *
    `,
    [guildId, guildName, ownerId]
  );

  if (result.rows[0]) return result.rows[0];

  // Row already existed — fetch it instead.
  return findByGuildId(guildId);
}

/**
 * Updates one or more top-level columns. `fields` keys must be in the
 * whitelist to prevent arbitrary column injection.
 */
export async function updateColumns(guildId, fields) {
  const entries = Object.entries(fields).filter(([key]) => COLUMN_WHITELIST.includes(key));

  if (entries.length === 0) {
    return findByGuildId(guildId);
  }

  const setClauses = entries.map(([key], index) => `${key} = $${index + 2}`);
  const values = entries.map(([, value]) => value);

  const result = await query(
    `
    UPDATE guild_settings
    SET ${setClauses.join(', ')}, updated_at = now()
    WHERE guild_id = $1
    RETURNING *
    `,
    [guildId, ...values]
  );

  return result.rows[0] ?? null;
}

/**
 * Shallow-merges `partialSettings` into the JSONB `settings` column.
 * Existing keys not present in `partialSettings` are left untouched.
 */
export async function mergeSettingsJson(guildId, partialSettings) {
  const result = await query(
    `
    UPDATE guild_settings
    SET settings = settings || $2::jsonb, updated_at = now()
    WHERE guild_id = $1
    RETURNING *
    `,
    [guildId, JSON.stringify(partialSettings)]
  );

  return result.rows[0] ?? null;
}

export async function remove(guildId) {
  await query('DELETE FROM guild_settings WHERE guild_id = $1', [guildId]);
}
