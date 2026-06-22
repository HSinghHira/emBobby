import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand } from '../../core/command.js';
import { setupServer, buildSetupSummaryEmbed } from './index.js';
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
    ),

  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 30,

  async execute(interaction) {
    const channelsAction = interaction.options.getString('channels');
    const rolesAction = interaction.options.getString('roles');

    // Map choice values to boolean flags for the internal service/embed APIs
    const options = {
      deleteChannels: channelsAction === 'uninstall' || channelsAction === 'reinstall',
      deleteRoles: rolesAction === 'uninstall' || rolesAction === 'reinstall',
      createRoles: rolesAction === 'install' || rolesAction === 'reinstall',
      createChannels: channelsAction === 'install' || channelsAction === 'reinstall',
    };

    const hasAnyAction = Object.values(options).some(Boolean);
    if (!hasAnyAction) {
      throw new ValidationError(
        'Specify at least one action (e.g. `channels: Install` or `roles: Reinstall`).',
      );
    }

    await interaction.deferReply();

    const summary = await setupServer(interaction.guild, options);
    const embed = buildSetupSummaryEmbed(summary, options);

    await interaction.editReply({ embeds: [embed] });
  },
});