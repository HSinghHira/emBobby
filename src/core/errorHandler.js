import { logger } from '../shared/logger.js';
import { AppError } from '../shared/errors.js';

/**
 * Handles an error thrown during command execution and replies to the
 * interaction with a consistent, user-safe message. Operational errors
 * (AppError and subclasses) show their own message; anything unexpected
 * shows a generic one so internals are never leaked to users.
 */
export async function handleInteractionError(interaction, error) {
  const isOperational = error instanceof AppError;

  if (isOperational) {
    logger.warn(`Handled error in /${interaction.commandName}: ${error.message}`);
  } else {
    logger.error(`Unexpected error in /${interaction.commandName}:`, error);
  }

  const content = isOperational
    ? error.userMessage
    : 'Something went wrong while running this command.';

  const response = { content, ephemeral: true };

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  } catch (replyError) {
    logger.error('Failed to send error response to interaction.', replyError);
  }
}

/**
 * Registers process-level safety nets so an unhandled error never silently
 * kills the bot without a log trail. Should be called once at startup.
 */
export function registerProcessErrorHandlers() {
  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
  });
}
