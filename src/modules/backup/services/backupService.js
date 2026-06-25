import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { BACKUP_CONFIG } from '../config/backupConfig.js';
import { query } from '../../../services/database.js';
import { getModuleSettings, updateModuleSettings } from '../../../services/guildConfigService.js';
import { isVerificationEnabled, getVerifiedUsers } from '../../verification/index.js';
import { addMemberToGuild } from '../../verification/services/oauthService.js';
import { findRole, findCategory, findChannel, safeDeleteRole, safeDeleteChannel } from '../../serverSetup/utils/serverSetupUtils.js';
import { logger } from '../../../shared/logger.js';
import { ValidationError } from '../../../shared/errors.js';

const MODULE_KEY = 'backup';

/**
 * Serialises a single role into a plain object (excluding @everyone,
 * managed roles, and roles above the bot's highest position).
 */
function serializeRole(role) {
  return {
    name: role.name,
    color: role.hexColor,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.toArray(),
    position: role.position,
  };
}

/**
 * Serialises a channel's permission overwrites into a portable format.
 */
function serializeOverwrites(channel) {
  return [...channel.permissionOverwrites.cache.values()].map((ow) => ({
    id: ow.id,
    type: ow.type,
    allow: ow.allow.toArray(),
    deny: ow.deny.toArray(),
  }));
}

/**
 * Serialises a single channel into a plain object.
 */
function serializeChannel(channel) {
  return {
    name: channel.name,
    type: channel.type,
    topic: channel.topic ?? null,
    position: channel.position,
    parentId: channel.parentId,
    nsfw: channel.nsfw ?? false,
    rateLimitPerUser: channel.rateLimitPerUser ?? 0,
    permissionOverwrites: serializeOverwrites(channel),
  };
}

/**
 * Serialises a category and its child channels into a portable structure.
 */
function serializeCategory(category, childChannels) {
  return {
    name: category.name,
    type: category.type,
    position: category.position,
    permissionOverwrites: serializeOverwrites(category),
    channels: childChannels.map(serializeChannel),
  };
}

/**
 * Captures a full snapshot of the guild's structure:
 *  - Roles (excluding @everyone, managed, and bot's top+)
 *  - Categories with their child channels
 *  - Standalone channels (not in a category)
 *
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<object>} Serialised guild layout.
 */
export async function captureGuildLayout(guild) {
  await guild.fetch();
  await guild.channels.fetch();
  await guild.roles.fetch();

  const botHighestPosition = guild.members.me?.roles.highest.position ?? 0;

  /* ── Serialise roles ───────────────────────────────────────── */
  const roles = [];
  for (const [, role] of guild.roles.cache) {
    if (role.id === guild.id) continue; // @everyone
    if (role.managed) continue;
    if (role.position >= botHighestPosition) continue;
    roles.push(serializeRole(role));
  }

  /* ── Serialise categories and channels ─────────────────────── */
  const categories = [];
  const standaloneChannels = [];

  for (const [, channel] of guild.channels.cache) {
    if (channel.type === ChannelType.GuildCategory) {
      const children = [...channel.children.cache.values()]
        .filter((c) => c.type !== ChannelType.GuildCategory)
        .sort((a, b) => a.position - b.position);

      categories.push(serializeCategory(channel, children));
    }
  }

  // Channels not in any category
  for (const [, channel] of guild.channels.cache) {
    if (channel.type === ChannelType.GuildCategory) continue;
    if (channel.parentId) continue; // already captured as child
    standaloneChannels.push(serializeChannel(channel));
  }

  return { roles, categories, standaloneChannels };
}

/**
 * Enables the backup module for a guild.
 * Captures the current server layout and stores it alongside
 * the verified users' OAuth2 tokens in the database.
 *
 * Dependency guard: verification must be enabled first.
 *
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{error: string|null, backupId: number|null}>}
 */
export async function enableBackup(guild) {
  try {
    /* ── Dependency guard ─────────────────────────────────────── */
    const verificationEnabled = await isVerificationEnabled(guild.id);
    if (!verificationEnabled) {
      return {
        error: 'Cannot enable backup: the Verification module must be installed first. Run `/setup verification:Install` first.',
        backupId: null,
      };
    }

    /* ── Capture layout ───────────────────────────────────────── */
    const layout = await captureGuildLayout(guild);

    /* ── Fetch verified user tokens ───────────────────────────── */
    const verifiedUsers = await getVerifiedUsers(guild.id);

    /* ── Store backup ─────────────────────────────────────────── */
    const backupPayload = {
      guildName: guild.name,
      guildId: guild.id,
      layout,
      verifiedUsers: verifiedUsers.map((u) => ({
        discordId: u.discord_id,
        oauth2Token: u.oauth2_token,
        oauth2Refresh: u.oauth2_refresh,
      })),
    };

    const result = await query(
      `
      INSERT INTO server_backups (source_guild_id, backup_data, token_count)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (source_guild_id)
      DO UPDATE SET backup_data = EXCLUDED.backup_data,
                    token_count = EXCLUDED.token_count,
                    updated_at = now()
      RETURNING id
      `,
      [guild.id, JSON.stringify(backupPayload), verifiedUsers.length],
    );

    const backupId = result.rows[0].id;

    /* ── Persist enabled state ────────────────────────────────── */
    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: true,
      backupId,
    });

    logger.success(`Backup enabled for guild ${guild.id} (backup #${backupId}, ${verifiedUsers.length} tokens).`);
    return { error: null, backupId };
  } catch (error) {
    logger.error(`Failed to enable backup for guild ${guild.id}:`, error);
    return { error: error.message, backupId: null };
  }
}

/**
 * Disables the backup module for a guild.
 * Removes the stored backup data and marks the module as disabled.
 *
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{error: string|null}>}
 */
export async function disableBackup(guild) {
  try {
    await query('DELETE FROM server_backups WHERE source_guild_id = $1', [guild.id]);

    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: false,
      backupId: null,
    });

    logger.info(`Backup disabled for guild ${guild.id}.`);
    return { error: null };
  } catch (error) {
    logger.error(`Failed to disable backup for guild ${guild.id}:`, error);
    return { error: error.message };
  }
}

/**
 * Checks whether backup is currently enabled for a guild.
 */
export async function isBackupEnabled(guildId) {
  const settings = await getModuleSettings(guildId, MODULE_KEY);
  return settings.enabled === true;
}

/**
 * Retrieves the stored backup data for a guild.
 *
 * @param {string} guildId
 * @returns {Promise<object|null>}
 */
export async function getBackupData(guildId) {
  const result = await query(
    'SELECT backup_data, token_count, created_at, updated_at FROM server_backups WHERE source_guild_id = $1',
    [guildId],
  );
  return result.rows[0] ?? null;
}

/**
 * Restores a backup onto a target guild (the /clone command).
 * 1. Deletes all existing channels/roles on the target.
 * 2. Recreates roles from the backup.
 * 3. Recreates categories and channels with their permissions.
 * 4. Uses stored OAuth2 tokens to re-add verified members.
 *
 * @param {import('discord.js').Guild} targetGuild - The fresh/new guild.
 * @param {object} backupData - The backup payload from server_backups.
 * @returns {Promise<{error: string|null, rolesCreated: number, channelsCreated: number, membersAdded: number}>}
 */
export async function restoreBackup(targetGuild, backupData) {
  const { layout, verifiedUsers } = backupData;
  let rolesCreated = 0;
  let channelsCreated = 0;
  let membersAdded = 0;

  try {
    /* ── Step 1: Wipe the target guild ────────────────────────── */
    await targetGuild.fetch();
    await targetGuild.channels.fetch();
    await targetGuild.roles.fetch();

    // Delete all channels
    for (const [, channel] of targetGuild.channels.cache) {
      await safeDeleteChannel(channel);
    }

    // Delete all roles (except @everyone, managed, and bot's top+)
    const botHighestPosition = targetGuild.members.me?.roles.highest.position ?? 0;
    for (const [, role] of targetGuild.roles.cache) {
      if (role.id === targetGuild.id) continue;
      if (role.managed) continue;
      if (role.position >= botHighestPosition) continue;
      await safeDeleteRole(role);
    }

    /* ── Step 2: Recreate roles ───────────────────────────────── */
    // Sort by position ascending so they end up in the right order
    const sortedRoles = [...layout.roles].sort((a, b) => a.position - b.position);

    for (const roleDef of sortedRoles) {
      try {
        await targetGuild.roles.create({
          name: roleDef.name,
          color: roleDef.color || undefined,
          hoist: roleDef.hoist ?? false,
          mentionable: roleDef.mentionable ?? false,
          permissions: roleDef.permissions || [],
        });
        rolesCreated += 1;
      } catch (err) {
        logger.warn(`Failed to recreate role "${roleDef.name}": ${err.message}`);
      }
    }

    // Re-fetch roles so we can resolve them for channel permissions
    await targetGuild.roles.fetch();

    /* ── Step 3: Recreate categories and channels ─────────────── */
    const categoryMap = new Map();

    for (const catDef of layout.categories) {
      try {
        const overwrites = resolveOverwrites(targetGuild, catDef.permissionOverwrites);
        const category = await targetGuild.channels.create({
          name: catDef.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: overwrites,
        });
        categoryMap.set(catDef.name, category);

        for (const chDef of catDef.channels) {
          try {
            const chOverwrites = resolveOverwrites(targetGuild, chDef.permissionOverwrites);
            await targetGuild.channels.create({
              name: chDef.name,
              type: chDef.type,
              parent: category.id,
              topic: chDef.topic ?? undefined,
              nsfw: chDef.nsfw ?? false,
              rateLimitPerUser: chDef.rateLimitPerUser ?? 0,
              permissionOverwrites: chOverwrites,
            });
            channelsCreated += 1;
          } catch (err) {
            logger.warn(`Failed to recreate channel "${chDef.name}": ${err.message}`);
          }
        }
      } catch (err) {
        logger.warn(`Failed to recreate category "${catDef.name}": ${err.message}`);
      }
    }

    // Standalone channels
    for (const chDef of layout.standaloneChannels) {
      try {
        const overwrites = resolveOverwrites(targetGuild, chDef.permissionOverwrites);
        await targetGuild.channels.create({
          name: chDef.name,
          type: chDef.type,
          topic: chDef.topic ?? undefined,
          nsfw: chDef.nsfw ?? false,
          rateLimitPerUser: chDef.rateLimitPerUser ?? 0,
          permissionOverwrites: overwrites,
        });
        channelsCreated += 1;
      } catch (err) {
        logger.warn(`Failed to recreate standalone channel "${chDef.name}": ${err.message}`);
      }
    }

    /* ── Step 4: Re-add verified members via OAuth2 ───────────── */
    if (verifiedUsers && verifiedUsers.length > 0) {
      for (const user of verifiedUsers) {
        const success = await addMemberToGuild(targetGuild.id, user.discordId, user.oauth2Token);
        if (success) {
          membersAdded += 1;
        }
      }
    }

    logger.success(
      `Backup restored on guild ${targetGuild.id}: ${rolesCreated} roles, ${channelsCreated} channels, ${membersAdded} members.`,
    );

    return { error: null, rolesCreated, channelsCreated, membersAdded };
  } catch (error) {
    logger.error(`Failed to restore backup on guild ${targetGuild.id}:`, error);
    return { error: error.message, rolesCreated, channelsCreated, membersAdded };
  }
}

/**
 * Resolves stored permission overwrites (which reference role names)
 * into live Discord overwrite objects by looking up role IDs.
 * Falls back to the stored ID if the role can't be found by name.
 */
function resolveOverwrites(guild, storedOverwrites) {
  return storedOverwrites.map((ow) => {
    // Try to find the role by name first (for portability across guilds)
    const role = findRole(guild, ow.id);
    return {
      id: role?.id ?? ow.id,
      type: ow.type,
      allow: ow.allow ?? [],
      deny: ow.deny ?? [],
    };
  });
}