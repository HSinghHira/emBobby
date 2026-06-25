import { Client, Collection, GatewayIntentBits } from 'discord.js';

/**
 * Builds the Discord client with the minimum intents required
 * for slash commands and server member events.
 *
 * Required intents:
 *  - Guilds → guild/channel/role data, slash commands
 *  - GuildMembers → guildMemberAdd/MemberRemove events (auto-role assignment)
 *  - GuildMessages → read messages in the verify channel (for button interactions)
 *  - MessageContent → parse button interaction payloads
 */
export function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = new Collection();

  return client;
}
