/**
 * Public API for the logging module.
 *
 * Consumers outside this directory (commands, events, other modules)
 * should import ONLY from this file. Internal implementation details
 * — services, config — are not part of the public contract.
 *
 * The default export is the module descriptor consumed by the
 * dynamic module loader (src/core/moduleLoader.js). It declares
 * the module's commands, events, and lifecycle hooks so that
 * adding a new module is completely plug-and-play.
 */
export {
  logToChannel,
  logCommandUsage,
  logModerationAction,
  logAdminAction,
  enableLogging,
  disableLogging,
  reinstallLogging,
  isLoggingEnabled,
} from './services/loggingService.js';

export { LOGGING_CONFIG } from './config/loggingConfig.js';

/* ── Module descriptor for the dynamic loader ────────────────────────── */

export default {
  name: 'logging',
  description:
    'Provides logging infrastructure — command usage logs, moderation actions, and admin action logging.',
  version: '1.0.0',

  /**
   * Commands this module contributes to the bot.
   * The logging module currently exposes only service functions
   * consumed by other modules; it doesn't register its own commands.
   */
  commands: [],

  /**
   * Events this module listens to.
   * The logging module could listen for guild events
   * (messageDelete, memberUpdate, etc.) in the future.
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
