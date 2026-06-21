import { Client, Collection, GatewayIntentBits } from 'discord.js';

/**
 * Builds the Discord client with the minimum intents required
 * for slash command functionality.
 */
export function createClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.commands = new Collection();

  return client;
}
