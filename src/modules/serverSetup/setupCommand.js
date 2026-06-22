import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand } from '../../core/command.js';
import { setupServer, buildSetupSummaryEmbed } from './index.js';
import { ValidationError } from '../../shared/errors.js';

export const setupCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Mass-create or delete server roles and channels from configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName('delete_channels')
        .setDescription('Delete every channel in the server.')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option.setName('delete_roles').setDescription('Delete every deletable role.').setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('create_roles')
        .setDescription('Create roles from configuration.')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('create_channels')
        .setDescription('Create categories and channels from configuration.')
        .setRequired(false)
    ),

  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 30,

  async execute(interaction) {
    const options = {
      deleteChannels: interaction.options.getBoolean('delete_channels') ?? false,
      deleteRoles: interaction.options.getBoolean('delete_roles') ?? false,
      createRoles: interaction.options.getBoolean('create_roles') ?? false,
      createChannels: interaction.options.getBoolean('create_channels') ?? false,
    };

    const hasAnyAction = Object.values(options).some(Boolean);
    if (!hasAnyAction) {
      throw new ValidationError('Set at least one option to true (e.g. `create_roles: true`).');
    }

    await interaction.deferReply();

    const summary = await setupServer(interaction.guild, options);
    const embed = buildSetupSummaryEmbed(summary, options);

    await interaction.editReply({ embeds: [embed] });
  },
});