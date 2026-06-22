import { ChannelType } from 'discord.js';

/**
 * Centralised configuration for the Logging module.
 *
 * The logs channel is created under the "📂 Staff" category when the
 * module is enabled via `/setup logging:Enable`. These values are the
 * single source of truth — the logging service and the channel config
 * both reference them to stay in sync.
 */
export const LOGGING_CONFIG = {
  /** Name of the Discord channel where log entries are posted. */
  channelName: '📑┋𝐋𝐨𝐠𝐬',

  /** Channel topic shown in the Discord UI. */
  channelTopic: 'Moderation logs',

  /** discord.js channel type — plain text channel for log embeds. */
  channelType: ChannelType.GuildText,

  /** Name of the parent category the channel must sit under. */
  categoryName: '📂 Staff',
};