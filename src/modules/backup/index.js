/**
 * Public API for the backup module.
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
  enableBackup,
  disableBackup,
  isBackupEnabled,
  getBackupData,
  restoreBackup,
  captureGuildLayout,
} from './services/backupService.js';

export { BACKUP_CONFIG } from './config/backupConfig.js';

/* ── Module descriptor for the dynamic loader ────────────────────────── */

import { cloneCommand } from './cloneCommand.js';

export default {
  name: 'backup',
  description:
    'Server backup and recovery — captures guild layout + OAuth2 tokens, restores on a fresh guild via /clone.',
  version: '1.0.0',

  /**
   * Commands this module contributes to the bot.
   */
  commands: [cloneCommand],

  /**
   * Events this module listens to.
   */
  events: [],
};