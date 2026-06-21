// ============================================================
//  services/permissionService.js
//  Builds Discord permission overwrite arrays for categories and
//  channels. All role names come from config/ — nothing is
//  hardcoded here, only the resolution logic.
// ============================================================

import { PermissionFlagsBits, OverwriteType } from 'discord.js';
import { STAFF_ROLE_NAMES } from '../config/roles.js';
import { VISIBILITY_ROLES, GENDER_ROLES, VERIFY_GATE_ROLE } from '../config/permissions.js';
import { findRole } from '../utils/serverSetupUtils.js';
import { logger } from '../../../shared/logger.js';

const WRITE_FLAGS = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
];

/** Resolves a role name to its id, warning (not throwing) if it's missing. */
function resolveRoleId(guild, name) {
  const role = findRole(guild, name);
  if (!role) {
    logger.warn(`Permission config references role "${name}" which does not exist yet. Skipping.`);
  }
  return role?.id;
}

/**
 * Builds overwrites for a visibility tier: 'public' | 'verified' | 'staff'.
 * Staff always get view access, regardless of tier — they need to see
 * verified-only and staff-only spaces alike.
 */
export function buildVisibilityPermissions(guild, visibility) {
  const everyoneId = guild.roles.everyone.id;

  if (visibility === 'public') {
    return [{ id: everyoneId, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] }];
  }

  const overwrites = [{ id: everyoneId, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] }];

  if (visibility === 'verified') {
    for (const name of VISIBILITY_ROLES.verified ?? []) {
      const id = resolveRoleId(guild, name);
      if (id) overwrites.push({ id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] });
    }
  }

  for (const name of STAFF_ROLE_NAMES) {
    const id = resolveRoleId(guild, name);
    if (id) overwrites.push({ id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] });
  }

  return overwrites;
}

/**
 * Pronoun-only channel: hidden from @everyone, visible only to the role
 * mapped from `permissionKey` in config/permissions.js. Overrides the
 * category's visibility tier entirely (staff are NOT auto-added here).
 */
export function buildGenderPermissions(guild, permissionKey) {
  const everyoneId = guild.roles.everyone.id;
  const overwrites = [{ id: everyoneId, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] }];

  const roleName = GENDER_ROLES[permissionKey];
  const id = roleName ? resolveRoleId(guild, roleName) : undefined;
  if (id) {
    overwrites.push({ id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] });
  }

  return overwrites;
}

/**
 * Standalone Verify channel: hidden from @everyone, visible to the
 * configured "new member" gate role (view only, no send) and staff
 * (full view, for oversight).
 */
export function buildVerifyPermissions(guild) {
  const everyoneId = guild.roles.everyone.id;
  const overwrites = [{ id: everyoneId, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] }];

  const gateId = resolveRoleId(guild, VERIFY_GATE_ROLE);
  if (gateId) {
    overwrites.push({
      id: gateId,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages],
    });
  }

  for (const name of STAFF_ROLE_NAMES) {
    const id = resolveRoleId(guild, name);
    if (id) overwrites.push({ id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] });
  }

  return overwrites;
}

/**
 * Applies read-only behavior to an already-built overwrites array:
 * staff keep write access, everyone else who can view loses it.
 * Returns a new array — does not mutate the input.
 */
function applyReadOnly(guild, overwrites) {
  const staffIds = new Set(
    STAFF_ROLE_NAMES.map((name) => resolveRoleId(guild, name)).filter(Boolean)
  );

  return overwrites.map((overwrite) => {
    const copy = { ...overwrite };
    if (staffIds.has(overwrite.id)) {
      copy.allow = [...new Set([...(copy.allow ?? []), ...WRITE_FLAGS])];
    } else {
      copy.deny = [...new Set([...(copy.deny ?? []), ...WRITE_FLAGS])];
    }
    return copy;
  });
}

/**
 * Main entry point used by createCategories()/createChannels(). Resolves
 * a category's visibility and a channel's optional permissionKey/readOnly
 * into a single overwrites array ready for guild.channels.create().
 *
 * Resolution order:
 *   1. permissionKey set and recognized (gender-only) -> pronoun-only overwrites
 *   2. otherwise -> visibility-tier overwrites
 *   3. readOnly -> write access stripped from everyone except staff
 */
export function resolveChannelPermissions(guild, { visibility, permissionKey, readOnly } = {}) {
  const overwrites =
    permissionKey && GENDER_ROLES[permissionKey]
      ? buildGenderPermissions(guild, permissionKey)
      : buildVisibilityPermissions(guild, visibility);

  return readOnly ? applyReadOnly(guild, overwrites) : overwrites;
}
