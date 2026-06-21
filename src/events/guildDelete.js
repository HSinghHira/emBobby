import { removeGuildConfig } from '../services/guildConfigService.js';
import { botConfig } from '../config/bot.js';
import { logger } from '../shared/logger.js';

export default {
  name: 'guildDelete',
  async execute(guild) {
    if (botConfig.deleteConfigOnLeave) {
      await removeGuildConfig(guild.id);
      logger.info(`Left guild "${guild.name}" (${guild.id}) — configuration deleted.`);
      return;
    }

    logger.info(`Left guild "${guild.name}" (${guild.id}) — configuration retained.`);
  },
};
