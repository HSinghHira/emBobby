import { readdirSync, accessSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../shared/logger.js';

const MODULES_DIR = path.join(import.meta.dirname, '..', 'modules');

/**
 * Standardised module descriptor shape every module should follow:
 *
 * ```js
 * export default {
 *   name: 'my-module',                // Required — unique identifier
 *   description: 'Does something',    // Optional
 *   version: '1.0.0',                 // Optional
 *
 *   commands: [                       // Optional — array of command objects
 *     { data, execute, category, permissions, cooldownSeconds }
 *   ],
 *
 *   events: [                         // Optional — array of event descriptors
 *     { name, once, execute }
 *   ],
 *
 *   init: async (client) => { … },    // Optional — called during startup
 *
 *   onReady: async (client) => { … }, // Optional — called after client is "ready"
 * }
 * ```
 */

/**
 * Scans every sub-directory inside `src/modules`, imports its `index.js`,
 * and registers any commands, events, and initialisation hooks it exports.
 *
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ moduleCount: number, commandCount: number, eventCount: number }>}
 */
export async function loadModules(client) {
  const entries = readdirSync(MODULES_DIR, { withFileTypes: true });
  const moduleDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  let commandCount = 0;
  let eventCount = 0;
  const readyHooks = [];

  for (const dir of moduleDirs) {
    const indexPath = path.join(MODULES_DIR, dir, 'index.js');

    // Skip directories that don't have an index.js
    try {
      accessSync(indexPath);
    } catch {
      logger.warn(`Module directory "${dir}" has no index.js — skipping.`);
      continue;
    }

    const descriptor = (await import(pathToFileURL(indexPath).href)).default;

    if (!descriptor) {
      logger.warn(`Module "${dir}" does not default-export a descriptor — skipping.`);
      continue;
    }

    if (!descriptor.name) {
      logger.warn(`Module "${dir}" is missing "name" in its descriptor — skipping.`);
      continue;
    }

    // ── Register commands ──────────────────────────────────────────────
    if (Array.isArray(descriptor.commands)) {
      for (const cmd of descriptor.commands) {
        if (!cmd?.data || !cmd?.execute) {
          logger.warn(
            `Module "${descriptor.name}" has an invalid command entry — skipping.`,
          );
          continue;
        }

        if (client.commands.has(cmd.data.name)) {
          logger.warn(
            `Module "${descriptor.name}" tried to register duplicate command "${
              cmd.data.name
            }" — skipping.`,
          );
          continue;
        }

        client.commands.set(cmd.data.name, cmd);
        commandCount++;
      }
    }

    // ── Register events ────────────────────────────────────────────────
    if (Array.isArray(descriptor.events)) {
      for (const evt of descriptor.events) {
        if (!evt?.name || !evt?.execute) {
          logger.warn(
            `Module "${descriptor.name}" has an invalid event entry — skipping.`,
          );
          continue;
        }

        const bind = evt.once ? client.once.bind(client) : client.on.bind(client);
        bind(evt.name, (...args) => evt.execute(...args, client));
        eventCount++;
      }
    }

    // ── Collect initialisation hooks ───────────────────────────────────
    if (typeof descriptor.init === 'function') {
      await descriptor.init(client);
    }

    if (typeof descriptor.onReady === 'function') {
      readyHooks.push({ name: descriptor.name, fn: descriptor.onReady });
    }

    logger.info(`Loaded module: ${descriptor.name} (${dir})`);
  }

  // ── Register onReady hooks as a single "ready" event ────────────────
  if (readyHooks.length > 0) {
    client.on('ready', async (readyClient) => {
      for (const { name, fn } of readyHooks) {
        try {
          await fn(readyClient);
        } catch (err) {
          logger.error(`Module "${name}" onReady hook failed:`, err);
        }
      }
    });
  }

  logger.info(
    `Module loader finished — ${moduleDirs.length} module(s), ` +
      `${commandCount} command(s), ${eventCount} event(s).`,
  );

  return { moduleCount: moduleDirs.length, commandCount, eventCount };
}