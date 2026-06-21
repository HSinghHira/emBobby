import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

/**
 * Registers all loaded slash commands with Discord.
 * Registers to a single guild (instant) if DISCORD_GUILD_ID is set,
 * otherwise registers globally (can take up to an hour to propagate).
 */
export async function registerCommands(client) {
  const rest = new REST().setToken(env.discordToken);
  const body = client.commands.map((command) => command.data.toJSON());

  const route = env.guildId
    ? Routes.applicationGuildCommands(env.clientId, env.guildId)
    : Routes.applicationCommands(env.clientId);

  await rest.put(route, { body });

  logger.info(
    `Registered ${body.length} slash command(s) ${env.guildId ? 'to guild' : 'globally'}.`
  );
}
