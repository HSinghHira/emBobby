/**
 * Public API for the logging module.
 *
 * Consumers outside this directory (commands, events, other modules)
 * should import ONLY from this file. Internal implementation details
 * — services, config — are not part of the public contract.
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