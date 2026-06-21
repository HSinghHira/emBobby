import { enforceCooldown } from '../core/cooldownManager.js';
import { handleInteractionError } from '../core/errorHandler.js';
import { PermissionError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command invoked: ${interaction.commandName}`);
      return;
    }

    try {
      if (command.permissions.length > 0 && interaction.inGuild()) {
        const missing = interaction.memberPermissions?.missing(command.permissions) ?? [];
        if (missing.length > 0) {
          throw new PermissionError(
            `You need the following permission(s) to use this command: ${missing.join(', ')}`
          );
        }
      }

      enforceCooldown(command.data.name, interaction.user.id, command.cooldownSeconds);

      await command.execute(interaction);
    } catch (error) {
      await handleInteractionError(interaction, error);
    }
  },
};
