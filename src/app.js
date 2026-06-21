import { env } from './config/env.js';
import { connectDatabase, closeDatabase } from './services/database.js';
import { runMigrations } from './services/migrations.js';
import { createClient } from './core/client.js';
import { loadCommands } from './core/commandLoader.js';
import { loadEvents } from './core/eventLoader.js';
import { registerCommands } from './core/registerCommands.js';
import { registerProcessErrorHandlers } from './core/errorHandler.js';
import { logger } from './shared/logger.js';

let client;

async function start() {
  registerProcessErrorHandlers();

  logger.info('Starting emBobby...');

  await connectDatabase();
  logger.success('Connected to PostgreSQL.');

  await runMigrations();

  client = createClient();

  await loadCommands(client);
  await loadEvents(client);
  await registerCommands(client);

  await client.login(env.discordToken);
}

/**
 * Closes the Discord connection and database pool cleanly so the process
 * doesn't get killed mid-operation by the host (e.g. on redeploy).
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    client?.destroy();
    await closeDatabase();
    logger.info('Shutdown complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error('Failed to start emBobby:', error);
  process.exit(1);
});
