import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Confirms the bot is working.'),

  async execute(interaction) {
    await interaction.reply('The bot is working.');
  },
};
