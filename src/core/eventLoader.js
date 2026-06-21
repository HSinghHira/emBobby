import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../shared/logger.js';

const EVENTS_DIR = path.join(import.meta.dirname, '..', 'events');

/**
 * Loads every event module from src/events and binds them to the client.
 * Each event file must export `name`, `execute`, and optionally `once`.
 */
export async function loadEvents(client) {
  const files = readdirSync(EVENTS_DIR).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(EVENTS_DIR, file);
    const event = (await import(pathToFileURL(filePath).href)).default;

    if (!event?.name || !event?.execute) {
      logger.warn(`Skipped invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  logger.info(`Loaded ${files.length} event(s).`);
}
