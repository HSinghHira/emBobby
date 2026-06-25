import { ChannelType } from 'discord.js';

/**
 * Centralised configuration for the Verification module.
 */
export const VERIFICATION_CONFIG = {
  /** Name of the standalone Verify channel. */
  channelName: '❓│𝐕𝐞𝐫𝐢𝐟𝐲',

  /** Channel topic shown in the Discord UI. */
  channelTopic: 'Verify your identity via OAuth2 to gain access to the server.',

  /** discord.js channel type — plain text for the verify button/embed. */
  channelType: ChannelType.GuildText,

  /** Name of the role assigned to newly joined (unverified) members. */
  newMemberRoleName: '🆕 New Member',

  /** Name of the role assigned after successful OAuth2 verification. */
  verifiedMemberRoleName: '👌 Verified Member',

  /** Names of roles that are considered "staff" for permission purposes. */
  staffRoleNames: ['👑 Owner', '🛡️ Senior Mod', '🛡️ Junior Mod', '🛡️ Trial Mod'],
};