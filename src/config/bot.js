import { env } from './env.js';

/**
 * Bot behavior configuration. Anything here is safe to tweak without
 * touching environment variables — defaults that apply across all commands
 * unless a command overrides them.
 */
export const botConfig = {
  /** Used as a fallback if a command doesn't define its own cooldown. */
  defaultCooldownSeconds: 3,

  /** Whether commands are registered to a single guild (instant) or globally. */
  isGuildScoped: Boolean(env.guildId),
};
