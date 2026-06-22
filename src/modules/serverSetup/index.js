/**
 * Public API for the serverSetup module.
 *
 * Every consumer outside this directory (commands, other modules,
 * core) should import ONLY from this file. Internal implementation
 * details — services, utils, config, embeds — are not part of the
 * public contract and may change without notice.
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
