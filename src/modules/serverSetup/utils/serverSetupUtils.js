import { ChannelType } from 'discord.js';
import { logger } from '../../../shared/logger.js';

/** Finds a role on the guild by exact (case-insensitive) name. */
export function findRole(guild, name) {
  return guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase());
}

/** Finds a top-level category channel on the guild by exact (case-insensitive) name. */
export function findCategory(guild, name) {
  return guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Finds a channel by name. If `parentId` is provided, only matches a
 * channel inside that category — this lets two categories each have a
 * channel with the same name without colliding.
 */
export function findChannel(guild, name, parentId = null) {
  return guild.channels.cache.find((channel) => {
    if (channel.name.toLowerCase() !== name.toLowerCase()) return false;
    return parentId ? channel.parentId === parentId : true;
  });
}

/**
 * Deletes a role without throwing — already-deleted/forbidden roles are
 * logged and skipped rather than aborting the whole operation.
 * Returns true if the role was deleted, false otherwise.
 */
export async function safeDeleteRole(role) {
  try {
    await role.delete();
    return true;
  } catch (error) {
    logger.warn(`Failed to delete role "${role.name}": ${error.message}`);
    return false;
  }
}

/**
 * Deletes a channel without throwing — already-deleted/forbidden channels
 * are logged and skipped rather than aborting the whole operation.
 * Returns true if the channel was deleted, false otherwise.
 */
export async function safeDeleteChannel(channel) {
  try {
    await channel.delete();
    return true;
  } catch (error) {
    logger.warn(`Failed to delete channel "${channel.name}": ${error.message}`);
    return false;
  }
}

/**
 * Generic "create only if it doesn't already exist" helper.
 * `find` runs first; `create` only runs if `find` returns a falsy value.
 * Returns `{ item, created }` so callers can log/tally accordingly.
 */
export async function createIfMissing({ find, create }) {
  const existing = find();
  if (existing) {
    return { item: existing, created: false };
  }

  const item = await create();
  return { item, created: true };
}
