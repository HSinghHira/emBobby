/**
 * Public API for the serverSetup module.
 *
 * Every consumer outside this directory (commands, other modules,
 * core) should import ONLY from this file. Internal implementation
 * details — services, utils, config, embeds — are not part of the
 * public contract and may change without notice.
 *
 * The default export is the module descriptor consumed by the
 * dynamic module loader (src/core/moduleLoader.js). It declares
 * the module's commands, events, and lifecycle hooks so that
 * adding a new module is completely plug-and-play.
 */

export {
  setupServer,
  deleteChannels,
  deleteRoles,
  createRoles,
  createChannels,
  createCategories,
} from './services/serverSetupService.js';

export { buildSetupSummaryEmbed } from './embeds/setupSummaryEmbed.js';

export { setupCommand } from './setupCommand.js';

/* ── Module descriptor for the dynamic loader ────────────────────────── */

import { setupCommand as _setupCommand } from './setupCommand.js';

export default {
  name: 'server-setup',
  description:
    'Mass-create or delete server roles, channels, and categories from configuration files.',
  version: '1.0.0',

  /**
   * Commands this module contributes to the bot.
   * Each entry must be a command object built with `defineCommand()`
   * (i.e. it has `data`, `execute`, `category`, `permissions`,
   * and `cooldownSeconds`).
   */
  commands: [_setupCommand],

  /**
   * Events this module listens to.
   * Each entry must have `name`, `execute`, and optionally `once`.
   */
  events: [],

  /**
   * Called once during startup, after database migrations have run
   * but before the bot logs in. Useful for one-time setup logic.
   */
  // init: async (client) => { … },

  /**
   * Called after the client emits the "ready" event.
   * Useful for post-login initialisation that needs guild data.
   */
  // onReady: async (client) => { … },
};
