import { SlashCommandBuilder } from 'discord.js';
import { defineCommand } from '../core/command.js';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Confirms the bot is working.'),

  category: 'general',

  async execute(interaction) {
    await interaction.reply('The bot is working.');
  },
});
