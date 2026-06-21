import { botConfig } from '../config/bot.js';

/**
 * Standard shape every command must follow:
 *
 * defineCommand({
 *   data: new SlashCommandBuilder().setName('ping').setDescription('...'),
 *   category: 'general',                       // optional, defaults to 'general'
 *   permissions: [PermissionFlagsBits.Administrator], // optional, defaults to none
 *   cooldownSeconds: 5,                         // optional, defaults to botConfig value
 *   execute: async (interaction) => { ... },
 * });
 *
 * Wrapping commands through this factory means the loader and the
 * interaction handler can rely on every command having the same shape,
 * without each command file repeating boilerplate defaults.
 */
export function defineCommand({
  data,
  execute,
  category = 'general',
  permissions = [],
  cooldownSeconds = botConfig.defaultCooldownSeconds,
}) {
  if (!data) throw new Error('Command is missing required "data" property.');
  if (!execute) throw new Error('Command is missing required "execute" function.');

  return { data, execute, category, permissions, cooldownSeconds };
}
