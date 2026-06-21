import { ensureGuildConfig, isGuildInitialized } from '../services/guildConfigService.js';
import { logger } from '../shared/logger.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}.`);

    await syncGuildConfigs(client);
  },
};

/**
 * Ensures every guild the bot is currently in has a config record.
 * Covers guilds joined while the bot was offline (guildCreate only
 * fires for joins that happen while connected).
 */
async function syncGuildConfigs(client) {
  const guilds = [...client.guilds.cache.values()];
  let created = 0;

  for (const guild of guilds) {
    const alreadyInitialized = await isGuildInitialized(guild.id);
    if (alreadyInitialized) continue;

    await ensureGuildConfig(guild.id, { guildName: guild.name, ownerId: guild.ownerId });
    created++;
  }

  if (created > 0) {
    logger.info(`Initialized configuration for ${created} guild(s).`);
  }
}
