import { EmbedBuilder } from 'discord.js';
import { findChannel } from '../../serverSetup/utils/serverSetupUtils.js';
import { getModuleSettings, updateModuleSettings } from '../../../services/guildConfigService.js';
import { LOGGING_CONFIG } from '../config/loggingConfig.js';
import { COLORS } from '../../../config/constants.js';
import { logger } from '../../../shared/logger.js';

const MODULE_KEY = 'logging';

/**
 * Resolves the logs channel for a guild from the persisted channelId.
 * Returns the TextChannel or null if it no longer exists or logging is disabled.
 */
async function resolveLogChannel(guild) {
  const settings = await getModuleSettings(guild.id, MODULE_KEY);
  if (!settings.enabled || !settings.channelId) return null;

  const channel = guild.channels.cache.get(settings.channelId);
  if (!channel) {
    // Channel was deleted externally — clear the stale reference
    await updateModuleSettings(guild.id, MODULE_KEY, { channelId: null });
    logger.warn(`Log channel for guild ${guild.id} was deleted externally. Cleared stale reference.`);
    return null;
  }

  return channel;
}

/**
 * Log levels with corresponding embed colours and emoji prefixes.
 * Each level maps to a visual style so log entries are scannable at a glance.
 */
const LOG_LEVELS = {
  INFO: { color: COLORS.primary, emoji: '📘' },
  SUCCESS: { color: COLORS.success, emoji: '✅' },
  WARN: { color: COLORS.warning, emoji: '⚠️' },
  ERROR: { color: COLORS.error, emoji: '❌' },
  MOD: { color: 0xe67e22, emoji: '🛡️' },
  ADMIN: { color: 0x9b59b6, emoji: '⚙️' },
  COMMAND: { color: COLORS.primary, emoji: '🔧' },
};

/**
 * Posts a log entry to the configured logs channel.
 *
 * @param {Guild} guild - The Discord guild.
 * @param {'INFO'|'SUCCESS'|'WARN'|'ERROR'|'MOD'|'ADMIN'|'COMMAND'} level - Severity/category.
 * @param {string} title - Short title for the embed.
 * @param {Object} [fields] - Key-value pairs rendered as embed fields.
 * @param {string} [description] - Optional description body.
 */
export async function logToChannel(guild, level, title, fields, description) {
  try {
    const channel = await resolveLogChannel(guild);
    if (!channel) return;

    const style = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;

    const embed = new EmbedBuilder()
      .setTitle(`${style.emoji} ${title}`)
      .setColor(style.color)
      .setTimestamp();

    if (description) {
      embed.setDescription(description);
    }

    if (fields) {
      for (const [name, value] of Object.entries(fields)) {
        embed.addFields({ name, value: String(value), inline: true });
      }
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    // Never let a logging failure crash the bot — log to console and move on.
    logger.error(`Failed to post log entry to guild ${guild.id}:`, error);
  }
}

/**
 * Logs a command usage event.
 *
 * @param {CommandInteraction} interaction - The slash command interaction.
 */
export async function logCommandUsage(interaction) {
  if (!interaction.inGuild()) return;

  const opts = [];
  if (interaction.options.data?.length) {
    for (const opt of interaction.options.data) {
      opts.push(`${opt.name}: ${opt.value ?? '—'}`);
    }
  }

  await logToChannel(
    interaction.guild,
    'COMMAND',
    'Command Used',
    {
      User: `${interaction.user.tag} (${interaction.user.id})`,
      Channel: `<#${interaction.channelId}>`,
      Command: `/${interaction.commandName}`,
    },
    opts.length ? `**Options:** ${opts.join(', ')}` : null,
  );
}

/**
 * Logs a moderation action (ban, kick, mute, warn, etc.).
 *
 * @param {Guild} guild - The guild where the action occurred.
 * @param {User} moderator - The staff member who took action.
 * @param {User} target - The user who received the action.
 * @param {string} action - Human-readable action name (e.g. 'Ban', 'Mute').
 * @param {string} [reason] - Optional reason for the action.
 */
export async function logModerationAction(guild, moderator, target, action, reason) {
  await logToChannel(
    guild,
    'MOD',
    `${action}`,
    {
      Moderator: `${moderator.tag} (${moderator.id})`,
      Target: `${target.tag} (${target.id})`,
      Reason: reason ?? 'No reason provided',
    },
  );
}

/**
 * Logs a server management action (setup, config changes, etc.).
 *
 * @param {Guild} guild - The guild where the action occurred.
 * @param {User} admin - The administrator who performed the action.
 * @param {string} action - Human-readable action description.
 * @param {Object} [details] - Additional key-value details.
 */
export async function logAdminAction(guild, admin, action, details) {
  await logToChannel(guild, 'ADMIN', action, {
    Administrator: `${admin.tag} (${admin.id})`,
    ...details,
  });
}

/**
 * Deletes any channel in the guild that matches the log channel name
 * under the configured category. Used by both disable and reinstall.
 *
 * @param {Guild} guild
 * @param {string} [exceptChannelId] - Optional channel ID to skip (already deleted).
 */
async function deleteLogChannelFromGuild(guild, exceptChannelId) {
  for (const [, ch] of guild.channels.cache) {
    if (ch.name === LOGGING_CONFIG.channelName) {
      await ch.delete();
      logger.info(`Deleted log channel "${ch.name}" for guild ${guild.id}.`);
    }
  }
}

/**
 * Enables logging for a guild: creates the logs channel and persists settings.
 *
 * @param {Guild} guild - The guild to enable logging for.
 * @param {Map} categoryMap - Map of category name → CategoryChannel (from createCategories).
 * @returns {Promise<{channelId: string|null, error: string|null}>}
 */
export async function enableLogging(guild, categoryMap) {
  try {
    const category = categoryMap.get(LOGGING_CONFIG.categoryName);
    if (!category) {
      return {
        channelId: null,
        error: `Category "${LOGGING_CONFIG.categoryName}" not found. Run /setup channels:Install first.`,
      };
    }

    // Check if a logs channel already exists under the category
    const existing = findChannel(guild, LOGGING_CONFIG.channelName, category.id);
    if (existing) {
      await updateModuleSettings(guild.id, MODULE_KEY, {
        enabled: true,
        channelId: existing.id,
      });
      logger.info(`Logging enabled for guild ${guild.id} — using existing channel "${existing.name}".`);
      return { channelId: existing.id, error: null };
    }

    const channel = await guild.channels.create({
      name: LOGGING_CONFIG.channelName,
      type: LOGGING_CONFIG.channelType,
      parent: category.id,
      topic: LOGGING_CONFIG.channelTopic,
    });

    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: true,
      channelId: channel.id,
    });

    logger.success(`Logging enabled for guild ${guild.id} — created channel "${channel.name}".`);
    return { channelId: channel.id, error: null };
  } catch (error) {
    logger.error(`Failed to enable logging for guild ${guild.id}:`, error);
    return { channelId: null, error: error.message };
  }
}

/**
 * Disables logging for a guild. Deletes the logs channel and marks the
 * module as disabled in settings so no log entries are posted.
 *
 * @param {Guild} guild - The guild to disable logging for.
 */
export async function disableLogging(guild) {
  try {
    const settings = await getModuleSettings(guild.id, MODULE_KEY);

    // Delete the logs channel if it exists
    if (settings.channelId) {
      const existingChannel = guild.channels.cache.get(settings.channelId);
      if (existingChannel) {
        await existingChannel.delete();
        logger.info(`Deleted log channel "${existingChannel.name}" for guild ${guild.id}.`);
      }
    }

    // Clean up any orphaned channels with the same name
    await deleteLogChannelFromGuild(guild, settings.channelId);

    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: false,
      channelId: null,
    });

    logger.info(`Logging disabled for guild ${guild.id}.`);
    return { error: null };
  } catch (error) {
    logger.error(`Failed to disable logging for guild ${guild.id}:`, error);
    return { error: error.message };
  }
}

/**
 * Reinstalls logging: deletes the existing logs channel and creates a fresh one.
 *
 * @param {Guild} guild - The guild to reinstall logging for.
 * @param {Map} categoryMap - Map of category name → CategoryChannel.
 * @returns {Promise<{channelId: string|null, error: string|null}>}
 */
export async function reinstallLogging(guild, categoryMap) {
  try {
    const settings = await getModuleSettings(guild.id, MODULE_KEY);

    // Delete the existing channel if we know about it
    if (settings.channelId) {
      const existingChannel = guild.channels.cache.get(settings.channelId);
      if (existingChannel) {
        await existingChannel.delete();
        logger.info(`Deleted old log channel "${existingChannel.name}" for guild ${guild.id}.`);
      }
    }

    // Clean up any orphaned channels with the same name
    await deleteLogChannelFromGuild(guild, settings.channelId);

    // Now create a fresh one
    return enableLogging(guild, categoryMap);
  } catch (error) {
    logger.error(`Failed to reinstall logging for guild ${guild.id}:`, error);
    return { channelId: null, error: error.message };
  }
}

/**
 * Checks whether logging is currently enabled for a guild.
 *
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
export async function isLoggingEnabled(guildId) {
  const settings = await getModuleSettings(guildId, MODULE_KEY);
  return settings.enabled === true;
}