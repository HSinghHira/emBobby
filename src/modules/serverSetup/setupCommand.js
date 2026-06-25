import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand } from '../../core/command.js';
import { setupServer, buildSetupSummaryEmbed } from './index.js';
import { enableLogging, disableLogging, reinstallLogging } from '../logging/index.js';
import { createCategories } from './services/serverSetupService.js';
import { logAdminAction } from '../logging/index.js';
import {
  installVerification,
  uninstallVerification,
  reinstallVerification,
} from '../verification/index.js';
import { enableBackup, disableBackup } from '../backup/index.js';
import { ValidationError } from '../../shared/errors.js';

export const setupCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure server roles, channels, and modules.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('channels')
        .setDescription('Create, delete, or reinstall channels.')
        .setRequired(false)
        .addChoices(
          { name: 'Install', value: 'install' },
          { name: 'Uninstall', value: 'uninstall' },
          { name: 'Reinstall', value: 'reinstall' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('roles')
        .setDescription('Create, delete, or reinstall roles.')
        .setRequired(false)
        .addChoices(
          { name: 'Install', value: 'install' },
          { name: 'Uninstall', value: 'uninstall' },
          { name: 'Reinstall', value: 'reinstall' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('logging')
        .setDescription('Enable, disable, or reinstall the logging module.')
        .setRequired(false)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' },
          { name: 'Reinstall', value: 'reinstall' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('verification')
        .setDescription('Install, uninstall, or reinstall the verification module.')
        .setRequired(false)
        .addChoices(
          { name: 'Install', value: 'install' },
          { name: 'Uninstall', value: 'uninstall' },
          { name: 'Reinstall', value: 'reinstall' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('backup')
        .setDescription('Enable or disable the backup module (requires verification).')
        .setRequired(false)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' },
        )
    ),

  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 30,

  async execute(interaction) {
    const channelsAction = interaction.options.getString('channels');
    const rolesAction = interaction.options.getString('roles');
    const loggingAction = interaction.options.getString('logging');
    const verificationAction = interaction.options.getString('verification');
    const backupAction = interaction.options.getString('backup');

    // Map choice values to boolean flags for the internal service/embed APIs
    const options = {
      deleteChannels: channelsAction === 'uninstall' || channelsAction === 'reinstall',
      deleteRoles: rolesAction === 'uninstall' || rolesAction === 'reinstall',
      createRoles: rolesAction === 'install' || rolesAction === 'reinstall',
      createChannels: channelsAction === 'install' || channelsAction === 'reinstall',
    };

    const hasAnyAction =
      Object.values(options).some(Boolean) ||
      loggingAction != null ||
      verificationAction != null ||
      backupAction != null;

    if (!hasAnyAction) {
      throw new ValidationError(
        'Specify at least one action (e.g. `channels: Install`, `roles: Reinstall`, `logging: Enable`, `verification: Install`, or `backup: Enable`).',
      );
    }

    await interaction.deferReply();

    const summary = await setupServer(interaction.guild, options);

    // ── Handle logging action ──────────────────────────────────
    let loggingSummary = null;
    if (loggingAction) {
      const { categoryMap } = await createCategories(interaction.guild);

      switch (loggingAction) {
        case 'enable': {
          const result = await enableLogging(interaction.guild, categoryMap);
          loggingSummary = {
            action: 'Enable',
            success: !result.error,
            channelId: result.channelId,
            error: result.error,
          };
          break;
        }
        case 'disable': {
          const result = await disableLogging(interaction.guild);
          loggingSummary = {
            action: 'Disable',
            success: !result.error,
            error: result.error,
          };
          break;
        }
        case 'reinstall': {
          const result = await reinstallLogging(interaction.guild, categoryMap);
          loggingSummary = {
            action: 'Reinstall',
            success: !result.error,
            channelId: result.channelId,
            error: result.error,
          };
          break;
        }
      }

      await logAdminAction(
        interaction.guild,
        interaction.user,
        `Logging ${loggingSummary.action}d`,
        {
          Status: loggingSummary.success ? 'Success' : 'Failed',
          ...(loggingSummary.error ? { Error: loggingSummary.error } : {}),
        },
      );
    }

    // ── Handle verification action ─────────────────────────────
    let verificationSummary = null;
    if (verificationAction) {
      switch (verificationAction) {
        case 'install': {
          const result = await installVerification(interaction.guild);
          verificationSummary = {
            action: 'Install',
            success: !result.error,
            error: result.error,
            channelId: result.channelId,
            rolesCreated: result.rolesCreated,
          };
          break;
        }
        case 'uninstall': {
          const result = await uninstallVerification(interaction.guild);
          verificationSummary = {
            action: 'Uninstall',
            success: !result.error,
            error: result.error,
            rolesDeleted: result.rolesDeleted,
          };
          break;
        }
        case 'reinstall': {
          const result = await reinstallVerification(interaction.guild);
          verificationSummary = {
            action: 'Reinstall',
            success: !result.error,
            error: result.error,
            channelId: result.channelId,
            rolesCreated: result.rolesCreated,
          };
          break;
        }
      }

      await logAdminAction(
        interaction.guild,
        interaction.user,
        `Verification ${verificationSummary.action}ed`,
        {
          Status: verificationSummary.success ? 'Success' : 'Failed',
          ...(verificationSummary.error ? { Error: verificationSummary.error } : {}),
        },
      );
    }

    // ── Handle backup action ───────────────────────────────────
    let backupSummary = null;
    if (backupAction) {
      switch (backupAction) {
        case 'enable': {
          const result = await enableBackup(interaction.guild);
          backupSummary = {
            action: 'Enable',
            success: !result.error,
            error: result.error,
            backupId: result.backupId,
          };
          break;
        }
        case 'disable': {
          const result = await disableBackup(interaction.guild);
          backupSummary = {
            action: 'Disable',
            success: !result.error,
            error: result.error,
          };
          break;
        }
      }

      await logAdminAction(
        interaction.guild,
        interaction.user,
        `Backup ${backupSummary.action}d`,
        {
          Status: backupSummary.success ? 'Success' : 'Failed',
          ...(backupSummary.error ? { Error: backupSummary.error } : {}),
        },
      );
    }

    const embed = buildSetupSummaryEmbed(
      summary,
      options,
      loggingSummary,
      verificationSummary,
      backupSummary,
    );

    await interaction.editReply({ embeds: [embed] });
  },
});
