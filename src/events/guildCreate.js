import { ensureGuildConfig } from '../services/guildConfigService.js';
import { logger } from '../shared/logger.js';

export default {
  name: 'guildCreate',
  async execute(guild) {
    await ensureGuildConfig(guild.id, {
      guildName: guild.name,
      ownerId: guild.ownerId,
    });

    logger.info(`Joined guild "${guild.name}" (${guild.id}) — configuration initialized.`);
  },
};
