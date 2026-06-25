/**
 * Public API for the verification module.
 *
 * Consumers outside this directory (commands, events, other modules)
 * should import ONLY from this file. Internal implementation details
 * — services, config, embeds — are not part of the public contract.
 *
 * The default export is the module descriptor consumed by the
 * dynamic module loader (src/core/moduleLoader.js). It declares
 * the module's commands, events, and lifecycle hooks so that
 * adding a new module is completely plug-and-play.
 */

export {
  installVerification,
  uninstallVerification,
  reinstallVerification,
  isVerificationEnabled,
  assignNewMemberRole,
  completeVerification,
  getVerifiedUsers,
} from './services/verificationService.js';

export { buildOAuthUrl, exchangeCode, getUserInfo, refreshToken, addMemberToGuild } from './services/oauthService.js';

export { VERIFICATION_CONFIG } from './config/verificationConfig.js';

/* ── Module descriptor for the dynamic loader ────────────────────────── */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { buildOAuthUrl } from './services/oauthService.js';

const VERIFY_BUTTON_ID = 'verification_oauth_start';

export default {
  name: 'verification',
  description:
    'OAuth2-based member verification — creates verify channel, new-member role, verified-member role, and handles the join flow.',
  version: '1.0.0',

  /**
   * Commands this module contributes to the bot.
   * The verification module registers no standalone commands —
   * it is managed through /setup verification:Install|Uninstall|Reinstall.
   */
  commands: [],

  /**
   * Events this module listens to.
   */
  events: [
    {
      name: 'guildMemberAdd',
      execute: async (member) => {
        if (member.user.bot) return;
        const { assignNewMemberRole } = await import('./services/verificationService.js');
        await assignNewMemberRole(member);
      },
    },
    {
      name: 'interactionCreate',
      execute: async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.customId !== VERIFY_BUTTON_ID) return;

        const { isVerificationEnabled } = await import('./services/verificationService.js');
        const enabled = await isVerificationEnabled(interaction.guildId);
        if (!enabled) {
          return interaction.reply({
            content: 'Verification is not enabled on this server. Ask an admin to run `/setup verification:Install`.',
            ephemeral: true,
          });
        }

        const oauthUrl = buildOAuthUrl(interaction.guildId);

        const embed = new EmbedBuilder()
          .setTitle('🔐 Discord Verification')
          .setDescription(
            'Click the button below to verify your identity via Discord OAuth2.\n\n' +
            'You will be redirected to Discord\'s authorization page where you can grant access.\n' +
            'Once complete, you\'ll automatically receive the **Verified Member** role.',
          )
          .setColor(COLORS.primary)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Verify with Discord')
            .setStyle(ButtonStyle.Link)
            .setURL(oauthUrl)
            .setEmoji('🔐'),
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });
      },
    },
  ],

  /**
   * Called once during startup, after database migrations have run
   * but before the bot logs in. Useful for one-time setup logic.
   */
  // init: async (client) => { … },

  /**
   * Called after the client emits the "ready" event.
   * Useful for post-login initialisation that needs guild data.
   */
  // onReady: async (client) => { … },
};