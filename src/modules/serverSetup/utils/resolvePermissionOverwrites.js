import { PermissionFlagsBits } from 'discord.js';
import { PERMISSIONS } from '../config/permissions.js';
import { findRole } from './serverSetupUtils.js';
import { logger } from '../../../shared/logger.js';

const READ_ONLY_DENY_FLAGS = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
];

/**
 * Resolves a `permissionKey` (from permissions.js) and an optional
 * `readOnly` flag into a Discord permission overwrites array, ready to
 * pass straight into a channel/category `create()` call.
 *
 *   permissionKey -> who can VIEW the channel (visibility)
 *   readOnly      -> whoever CAN view it is denied the ability to write
 *
 * Roles referenced by a permissionKey that don't exist on the guild yet
 * are skipped with a warning rather than throwing, so a partial role
 * config doesn't block channel creation entirely.
 */
export function resolvePermissionOverwrites(guild, { permissionKey, readOnly } = {}) {
  const overwrites = [];
  const rule = permissionKey ? PERMISSIONS[permissionKey] : null;

  if (permissionKey && !rule) {
    logger.warn(`Unknown permissionKey "${permissionKey}" — no overwrites applied for it.`);
  }

  if (rule?.denyEveryone) {
    overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });

    for (const roleName of rule.allowRoles) {
      const role = findRole(guild, roleName);
      if (!role) {
        logger.warn(
          `Permission key "${permissionKey}" references role "${roleName}" which does not exist yet. Skipping overwrite.`
        );
        continue;
      }
      overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel] });
    }
  }

  if (readOnly) {
    if (rule?.denyEveryone) {
      // Deny writing for the same roles we just granted viewing to.
      for (const roleName of rule.allowRoles) {
        const role = findRole(guild, roleName);
        if (!role) continue;

        const existing = overwrites.find((overwrite) => overwrite.id === role.id);
        if (existing) {
          existing.deny = [...(existing.deny ?? []), ...READ_ONLY_DENY_FLAGS];
        } else {
          overwrites.push({ id: role.id, deny: READ_ONLY_DENY_FLAGS });
        }
      }
    } else {
      // Channel is visible to everyone, so deny writing for @everyone.
      overwrites.push({ id: guild.roles.everyone.id, deny: READ_ONLY_DENY_FLAGS });
    }
  }

  return overwrites;
}
