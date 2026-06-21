import * as repository from './guildSettingsRepository.js';
import { logger } from '../shared/logger.js';

/**
 * Centralized Guild Configuration Service.
 *
 * This is the ONLY interface other modules should use to read or write
 * per-guild settings. No module should query `guild_settings` directly —
 * that keeps caching, defaults, and validation consistent everywhere.
 *
 * Module-specific settings (logging, welcome, tickets, etc.) should be
 * stored under their own key inside the JSONB `settings` bucket via
 * `updateModuleSettings`, rather than adding new columns.
 */

// guildId -> row. Simple full-object cache, invalidated on every write.
// No TTL: guild config changes infrequently and writes always refresh it,
// so staleness isn't a practical concern here.
const cache = new Map();

function setCache(guildId, row) {
  if (row) cache.set(guildId, row);
  return row;
}

/**
 * Returns the config for a guild, creating it with defaults if it
 * doesn't exist yet. This is the safe default for most read paths.
 */
export async function getGuildConfig(guildId) {
  if (cache.has(guildId)) return cache.get(guildId);

  let row = await repository.findByGuildId(guildId);

  if (!row) {
    row = await repository.insertIfMissing(guildId);
    logger.info(`Created guild_settings record for guild ${guildId}.`);
  }

  return setCache(guildId, row);
}

/**
 * Ensures a config record exists, seeding it with known guild metadata.
 * Call this from the guildCreate event (and once at startup for guilds
 * the bot is already in) so names/owners are captured on first contact.
 */
export async function ensureGuildConfig(guildId, { guildName, ownerId } = {}) {
  if (cache.has(guildId)) return cache.get(guildId);

  const row = await repository.insertIfMissing(guildId, { guildName, ownerId });
  return setCache(guildId, row);
}

/** Returns true if a config record already exists, without creating one. */
export async function isGuildInitialized(guildId) {
  if (cache.has(guildId)) return true;
  const row = await repository.findByGuildId(guildId);
  if (row) setCache(guildId, row);
  return Boolean(row);
}

/**
 * Updates one or more top-level columns (guild_name, owner_id, locale,
 * timezone, embed_color). Use `updateModuleSettings` for module-specific
 * settings instead.
 */
export async function updateGuildConfig(guildId, fields) {
  const row = await repository.updateColumns(guildId, fields);
  return setCache(guildId, row);
}

/**
 * Merges settings into a module's namespace inside the JSONB `settings`
 * column, without disturbing other modules' settings.
 *
 * Example:
 *   await updateModuleSettings(guildId, 'logging', { enabled: true, channelId: '123' });
 *   // settings.logging = { enabled: true, channelId: '123' }
 */
export async function updateModuleSettings(guildId, moduleKey, partialSettings) {
  const current = await getGuildConfig(guildId);
  const currentModuleSettings = current.settings?.[moduleKey] ?? {};

  const row = await repository.mergeSettingsJson(guildId, {
    [moduleKey]: { ...currentModuleSettings, ...partialSettings },
  });

  return setCache(guildId, row);
}

/** Convenience reader for a single module's settings namespace. */
export async function getModuleSettings(guildId, moduleKey) {
  const config = await getGuildConfig(guildId);
  return config.settings?.[moduleKey] ?? {};
}

/**
 * Removes a guild's configuration entirely. Not called automatically on
 * guildDelete by default (see events/guildDelete.js + botConfig) — kept
 * available here for when that decision is made.
 */
export async function removeGuildConfig(guildId) {
  await repository.remove(guildId);
  cache.delete(guildId);
}
