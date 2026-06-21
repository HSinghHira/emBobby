import { CooldownError } from '../shared/errors.js';

// commandName -> Map<userId, expiryTimestampMs>
const cooldowns = new Map();

/**
 * Throws a CooldownError if the user is still on cooldown for this command.
 * Otherwise records a new cooldown window starting now.
 */
export function enforceCooldown(commandName, userId, cooldownSeconds) {
  if (!cooldownSeconds) return;

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const userCooldowns = cooldowns.get(commandName);
  const expiresAt = userCooldowns.get(userId);
  const now = Date.now();

  if (expiresAt && now < expiresAt) {
    throw new CooldownError((expiresAt - now) / 1000);
  }

  userCooldowns.set(userId, now + cooldownSeconds * 1000);
}
