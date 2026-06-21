/**
 * Base application error. All custom errors extend this so the error
 * handler can distinguish "expected" operational errors (safe to show
 * a clean message for) from unexpected bugs.
 */
export class AppError extends Error {
  constructor(message, { userMessage } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = true;
    this.userMessage = userMessage ?? message;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** Thrown when a command is missing required permissions. */
export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to use this command.') {
    super(message, { userMessage: message });
  }
}

/** Thrown when a command is invoked while on cooldown. */
export class CooldownError extends AppError {
  constructor(secondsRemaining) {
    const message = `Please wait ${secondsRemaining.toFixed(1)}s before using this command again.`;
    super(message, { userMessage: message });
    this.secondsRemaining = secondsRemaining;
  }
}

/** Thrown for invalid input/state that the user can fix. */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, { userMessage: message });
  }
}

/** Thrown for database failures. */
export class DatabaseError extends AppError {
  constructor(message, cause) {
    super(message, { userMessage: 'A database error occurred. Please try again later.' });
    this.cause = cause;
  }
}
