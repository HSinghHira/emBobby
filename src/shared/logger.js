/**
 * Centralized logger.
 * Provides leveled, timestamped, colored console output.
 * No external dependency — uses raw ANSI escape codes to keep the
 * dependency count minimal.
 */

const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const levels = {
  INFO: { label: 'INFO', color: colors.blue },
  SUCCESS: { label: 'SUCCESS', color: colors.green },
  WARN: { label: 'WARN', color: colors.yellow },
  ERROR: { label: 'ERROR', color: colors.red },
  DEBUG: { label: 'DEBUG', color: colors.magenta },
};

const isDebugEnabled = process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production';

function timestamp() {
  return new Date().toISOString();
}

function write(level, message, meta) {
  const { label, color } = levels[level];
  const prefix = `${colors.gray}${timestamp()}${colors.reset} ${color}[${label}]${colors.reset}`;
  const target = level === 'ERROR' || level === 'WARN' ? console.error : console.log;

  target(`${prefix} ${message}`);

  if (meta !== undefined) {
    target(meta);
  }
}

export const logger = {
  info: (message) => write('INFO', message),
  success: (message) => write('SUCCESS', message),
  warn: (message, meta) => write('WARN', message, meta),
  error: (message, error) => write('ERROR', message, error),
  debug: (message, meta) => {
    if (!isDebugEnabled) return;
    write('DEBUG', message, meta);
  },
};
