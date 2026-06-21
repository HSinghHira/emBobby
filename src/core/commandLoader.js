import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../shared/logger.js';

const COMMANDS_DIR = path.join(import.meta.dirname, '..', 'commands');

/**
 * Loads every command module from src/commands and attaches them
 * to client.commands. Each command file must export `data` and `execute`.
 */
export async function loadCommands(client) {
  const files = readdirSync(COMMANDS_DIR).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(COMMANDS_DIR, file);
    const command = (await import(pathToFileURL(filePath).href)).default;

    if (!command?.data || !command?.execute) {
      logger.warn(`Skipped invalid command file: ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  logger.info(`Loaded ${client.commands.size} command(s).`);
}
