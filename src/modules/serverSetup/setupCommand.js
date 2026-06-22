import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand } from '../../core/command.js';
import { setupServer, buildSetupSummaryEmbed } from './index.js';
import { enableLogging, disableLogging, reinstallLogging } from '../logging/index.js';
import { createCategories } from './services/serverSetupService.js';
import { logAdminAction } from '../logging/index.js';
import { ValidationError } from '../../shared/errors.js';

export const setupCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Mass-create or delete server roles and channels from configuration.')
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
    ),

  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 30,

  async execute(interaction) {
    const channelsAction = interaction.options.getString('channels');
    const rolesAction = interaction.options.getString('roles');
    const loggingAction = interaction.options.getString('logging');

    // Map choice values to boolean flags for the internal service/embed APIs
    const options = {
      deleteChannels: channelsAction === 'uninstall' || channelsAction === 'reinstall',
      deleteRoles: rolesAction === 'uninstall' || rolesAction === 'reinstall',
      createRoles: rolesAction === 'install' || rolesAction === 'reinstall',
      createChannels: channelsAction === 'install' || channelsAction === 'reinstall',
    };

    const hasAnyAction = Object.values(options).some(Boolean) || loggingAction != null;
    if (!hasAnyAction) {
      throw new ValidationError(
        'Specify at least one action (e.g. `channels: Install`, `roles: Reinstall`, or `logging: Enable`).',
      );
    }

    await interaction.deferReply();

    const summary = await setupServer(interaction.guild, options);

    // Handle logging action separately — it needs the categoryMap from setupServer
    let loggingSummary = null;
    if (loggingAction) {
      // Ensure categories exist so we can place the log channel
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

      // Log the admin action to the logs channel
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

    const embed = buildSetupSummaryEmbed(summary, options, loggingSummary);

    await interaction.editReply({ embeds: [embed] });
  },
});