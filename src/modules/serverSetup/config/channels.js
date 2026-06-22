import { ChannelType } from 'discord.js';

/**
 * Category/channel definitions for the server setup module.
 *
 * `type` uses the real discord.js ChannelType enum directly — no string
 * translation layer — so any channel type discord.js supports (including
 * Voice/Stage) just works without the config and service needing to agree
 * on a parallel naming scheme.
 *
 * Category fields:
 *   name       - category name
 *   visibility - 'public' (everyone can view) | 'verified' (Verified
 *                Member + staff) | 'staff' (staff only). Channels inherit
 *                this unless they set their own `permissionKey` override.
 *   channels   - array of channel definitions (below), created in order
 *
 * Channel fields:
 *   name          - channel name
 *   type          - ChannelType.GuildText | GuildAnnouncement | GuildForum
 *                    | GuildVoice | GuildStageVoice
 *   topic         - optional channel topic
 *   permissionKey - optional. One of 'he-only' | 'she-only' | 'they-only'
 *                    (see config/permissions.js). Overrides the category's
 *                    visibility entirely — the channel becomes visible only
 *                    to that pronoun role, regardless of category tier.
 *   readOnly      - optional boolean. Whoever can view the channel keeps
 *                    view access but loses SendMessages / thread creation,
 *                    except staff, who always retain write access.
 */
export const CATEGORIES = [
  // ── Information ──────────────────────────────────────────────
  {
    name: '📂 Information',
    visibility: 'verified',
    channels: [
      {
        name: '📢┋𝐀𝐧𝐧𝐨𝐮𝐧𝐜𝐞𝐦𝐞𝐧𝐭𝐬',
        type: ChannelType.GuildAnnouncement,
        topic: 'Official server announcements',
        readOnly: true,
      },
      { name: '📜┋𝐑𝐮𝐥𝐞𝐬', type: ChannelType.GuildText, topic: 'Server rules', readOnly: true },
    ],
  },

  // ── Community ────────────────────────────────────────────────
  {
    name: '📂 Community',
    visibility: 'verified',
    channels: [
      { name: '💬┋𝐂𝐡𝐚𝐭-𝐓𝐢𝐦𝐞', type: ChannelType.GuildText, topic: 'General chat' },
      { name: '📸┋𝐌𝐞𝐝𝐢𝐚', type: ChannelType.GuildText, topic: 'Share images & videos' },
      {
        name: '♀️┋𝐎𝐧𝐥𝐲-𝐒𝐇𝐄',
        type: ChannelType.GuildText,
        topic: 'SHE/HER only space',
        permissionKey: 'she-only',
      },
      {
        name: '♂️┋𝐎𝐧𝐥𝐲-𝐇𝐄',
        type: ChannelType.GuildText,
        topic: 'HE/HIM only space',
        permissionKey: 'he-only',
      },
      {
        name: '🌈┋𝐎𝐧𝐥𝐲-𝐓𝐇𝐄𝐘',
        type: ChannelType.GuildText,
        topic: 'THEY/THEM only space',
        permissionKey: 'they-only',
      },
    ],
  },

  // ── Extras ───────────────────────────────────────────────────
  {
    name: '📂 Extras',
    visibility: 'verified',
    channels: [
      { name: '🤖┋𝐁𝐨𝐭-𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬', type: ChannelType.GuildText, topic: 'Use bot commands here' },
      { name: '💡┋𝐒𝐮𝐠𝐠𝐞𝐬𝐭𝐢𝐨𝐧𝐬', type: ChannelType.GuildForum, topic: 'Suggest improvements' },
      { name: '👀┋𝐂𝐫𝐞𝐞𝐩-𝐂𝐨𝐧𝐭𝐫𝐨𝐥', type: ChannelType.GuildForum, topic: 'Watch list' },
    ],
  },

  // ── Staff ────────────────────────────────────────────────────
  {
    name: '📂 Staff',
    visibility: 'staff',
    channels: [
      { name: '🗪┋𝐃𝐢𝐬𝐜𝐮𝐬𝐬𝐢𝐨𝐧', type: ChannelType.GuildForum, topic: 'Staff discussion' },
      { name: '📑┋𝐋𝐨𝐠𝐬', type: ChannelType.GuildText, topic: 'Moderation logs' },
    ],
  },
];

/**
 * Standalone Verify channel — lives outside any category, hidden from
 * @everyone, visible to New Member (so they can verify) and staff.
 * Created/looked-up by createChannels() after the categorized channels.
 */