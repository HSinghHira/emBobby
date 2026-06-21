import { env } from './config/env.js';
import { connectDatabase } from './services/database.js';
import { createClient } from './core/client.js';
import { loadCommands } from './core/commandLoader.js';
import { loadEvents } from './core/eventLoader.js';
import { registerCommands } from './core/registerCommands.js';
import { logger } from './shared/logger.js';

async function start() {
  logger.info('Starting emBobby...');

  await connectDatabase();
  logger.info('Connected to PostgreSQL.');

  const client = createClient();

  await loadCommands(client);
  await loadEvents(client);
  await registerCommands(client);

  await client.login(env.discordToken);
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

start().catch((error) => {
  logger.error('Failed to start emBobby:', error);
  process.exit(1);
});
