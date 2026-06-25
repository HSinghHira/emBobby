import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand } from '../../core/command.js';
import { restoreBackup, getBackupData } from './services/backupService.js';
import { logger } from '../../shared/logger.js';
import { ValidationError } from '../../shared/errors.js';

/**
 * /clone — Restores a saved backup onto the current guild.
 *
 * This command is intended to be run on a fresh/new server to
 * recreate the full structure (roles, categories, channels, permissions)
 * and re-add verified members using their stored OAuth2 tokens.
 */
export const cloneCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Restore a saved backup (roles, channels, members) to this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('The ID of the source server whose backup should be restored.')
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('confirm')
        .setDescription(
          'Set to true to confirm. This will DELETE all existing channels/roles on this server.',
        )
        .setRequired(true),
    ),

  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 60,

  async execute(interaction) {
    const sourceGuildId = interaction.options.getString('source', true);
    const confirmed = interaction.options.getBoolean('confirm', true);

    if (!confirmed) {
      throw new ValidationError(
        'You must set `confirm: true` to proceed. This action will DELETE all existing channels and roles on this server.',
      );
    }

    if (sourceGuildId === interaction.guildId) {
      throw new ValidationError(
        'The source guild ID cannot be the same as the current guild. Backup/restore is designed to clone FROM a source server TO a fresh server.',
      );
    }

    await interaction.deferReply();

    /* ── Validate that a backup exists for the source guild ───── */
    const backupRow = await getBackupData(sourceGuildId);
    if (!backupRow) {
      throw new ValidationError(
        `No backup found for guild \`${sourceGuildId}\`. Ensure backup was enabled on the source server first via \`/setup backup:Enable\`.`,
      );
    }

    const backupData = backupRow.backup_data;
    if (!backupData?.layout) {
      throw new ValidationError('The stored backup is corrupt or incomplete. Please re-run `/setup backup:Enable` on the source server.');
    }

    logger.info(
      `Starting clone from guild ${sourceGuildId} to guild ${interaction.guildId} ` +
      `(${backupRow.token_count} tokens, backup #${backupRow.id}).`,
    );

    /* ── Execute the restore ──────────────────────────────────── */
    const result = await restoreBackup(interaction.guild, backupData);

    if (result.error) {
      await interaction.editReply({
        content: `❌ **Clone failed:** ${result.error}`,
      });
      return;
    }

    await interaction.editReply({
      content:
        `✅ **Clone complete!**\n\n` +
        `• Roles created: **${result.rolesCreated}**\n` +
        `• Channels created: **${result.channelsCreated}**\n` +
        `• Members re-added: **${result.membersAdded}**\n\n` +
        `The server structure has been restored from guild \`${sourceGuildId}\`.`,
    });
  },
});