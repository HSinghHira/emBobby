import { PermissionFlagsBits, OverwriteType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { VERIFICATION_CONFIG } from '../config/verificationConfig.js';
import { findRole, findChannel, safeDeleteChannel, createIfMissing } from '../../serverSetup/utils/serverSetupUtils.js';
import { getModuleSettings, updateModuleSettings } from '../../../services/guildConfigService.js';
import { query } from '../../../services/database.js';
import { logger } from '../../../shared/logger.js';

const MODULE_KEY = 'verification';

/**
 * Resolves the "New Member" role from the guild cache.
 */
function getNewMemberRole(guild) {
  return findRole(guild, VERIFICATION_CONFIG.newMemberRoleName);
}

/**
 * Resolves the "Verified Member" role from the guild cache.
 */
function getVerifiedMemberRole(guild) {
  return findRole(guild, VERIFICATION_CONFIG.verifiedMemberRoleName);
}

/**
 * Builds permission overwrites for the Verify channel:
 *  - @everyone: denied ViewChannel
 *  - 🆕 New Member: allowed ViewChannel, denied SendMessages
 *  - Staff roles: allowed ViewChannel + SendMessages
 */
function buildVerifyPermissions(guild) {
  const everyoneId = guild.roles.everyone.id;
  const overwrites = [
    { id: everyoneId, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
  ];

  const newMemberRole = getNewMemberRole(guild);
  if (newMemberRole) {
    overwrites.push({
      id: newMemberRole.id,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages],
    });
  }

  for (const name of VERIFICATION_CONFIG.staffRoleNames) {
    const role = findRole(guild, name);
    if (role) {
      overwrites.push({
        id: role.id,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      });
    }
  }

  return overwrites;
}

/**
 * Finds or creates the ❓│𝐕𝐞𝐫𝐢𝐟𝐲 channel.
 * Creates it as a top-level channel (no parent category) with restricted
 * permissions so only New Members and Staff can see it.
 */
async function ensureVerifyChannel(guild) {
  const existing = findChannel(guild, VERIFICATION_CONFIG.channelName);
  if (existing) return existing;

  const overwrites = buildVerifyPermissions(guild);

  const channel = await guild.channels.create({
    name: VERIFICATION_CONFIG.channelName,
    type: VERIFICATION_CONFIG.channelType,
    topic: VERIFICATION_CONFIG.channelTopic,
    permissionOverwrites: overwrites,
  });

  logger.success(`Created verify channel "${channel.name}" for guild ${guild.id}.`);
  return channel;
}

/**
 * Installs the verification module:
 * 1. Creates the 🆕 New Member role if missing.
 * 2. Creates the 👌 Verified Member role if missing.
 * 3. Creates the ❓│𝐕𝐞𝐫𝐢𝐟𝐲 channel with restricted permissions.
 * 4. Posts the verify button (an ActionRow with a "Verify" button that
 *    links to the OAuth2 URL or triggers a modal).
 * 5. Persists the module as enabled in guild settings.
 */
export async function installVerification(guild) {
  try {
    /* ── Create roles ─────────────────────────────────────────── */
    let rolesCreated = 0;
    let rolesSkipped = 0;

    for (const roleName of [VERIFICATION_CONFIG.newMemberRoleName, VERIFICATION_CONFIG.verifiedMemberRoleName]) {
      const existing = findRole(guild, roleName);
      if (existing) {
        rolesSkipped += 1;
        continue;
      }
      await guild.roles.create({ name: roleName, reason: 'Verification module install' });
      rolesCreated += 1;
      logger.success(`Created role "${roleName}" for guild ${guild.id}.`);
    }

    /* ── Create verify channel ────────────────────────────────── */
    const channel = await ensureVerifyChannel(guild);

    /* ── Post the verify button embed ─────────────────────────── */
    // We clear the channel first so if reinstalling, old messages are cleaned
    // (the channel is freshly created on reinstall, but we keep it safe).
    // For a first install the channel is empty.
    const verifyButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verification_oauth_start')
        .setLabel('Verify with Discord')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔐'),
    );

    await channel.send({
      content: '**Welcome!** Click the button below to verify your identity via Discord OAuth2 and gain full access to the server.',
      components: [verifyButton],
    });

    /* ── Persist enabled state ────────────────────────────────── */
    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: true,
      channelId: channel.id,
      verifiedRoleName: VERIFICATION_CONFIG.verifiedMemberRoleName,
      newMemberRoleName: VERIFICATION_CONFIG.newMemberRoleName,
    });

    logger.success(`Verification module installed for guild ${guild.id}.`);
    return { error: null, channelId: channel.id, rolesCreated, rolesSkipped };
  } catch (error) {
    logger.error(`Failed to install verification for guild ${guild.id}:`, error);
    return { error: error.message, channelId: null, rolesCreated: 0, rolesSkipped: 0 };
  }
}

/**
 * Uninstalls the verification module:
 * 1. Deletes the ❓│𝐕𝐞𝐫𝐢𝐟𝐲 channel.
 * 2. Deletes the 🆕 New Member and 👌 Verified Member roles.
 * 3. Marks the module as disabled in settings.
 */
export async function uninstallVerification(guild) {
  try {
    /* ── Delete the verify channel ────────────────────────────── */
    const channel = findChannel(guild, VERIFICATION_CONFIG.channelName);
    if (channel) {
      await safeDeleteChannel(channel);
    }

    /* ── Delete roles ─────────────────────────────────────────── */
    const botHighestPosition = guild.members.me?.roles.highest.position ?? 0;
    let rolesDeleted = 0;

    for (const roleName of [VERIFICATION_CONFIG.newMemberRoleName, VERIFICATION_CONFIG.verifiedMemberRoleName]) {
      const role = findRole(guild, roleName);
      if (!role) continue;
      if (role.position >= botHighestPosition) {
        logger.warn(`Cannot delete role "${roleName}" — at or above bot's highest role.`);
        continue;
      }
      try {
        await role.delete();
        rolesDeleted += 1;
      } catch (err) {
        logger.warn(`Failed to delete role "${roleName}": ${err.message}`);
      }
    }

    /* ── Persist disabled state ───────────────────────────────── */
    await updateModuleSettings(guild.id, MODULE_KEY, {
      enabled: false,
      channelId: null,
    });

    logger.info(`Verification module uninstalled for guild ${guild.id}.`);
    return { error: null, rolesDeleted };
  } catch (error) {
    logger.error(`Failed to uninstall verification for guild ${guild.id}:`, error);
    return { error: error.message, rolesDeleted: 0 };
  }
}

/**
 * Reinstalls the verification module (uninstall + install).
 */
export async function reinstallVerification(guild) {
  const uninstallResult = await uninstallVerification(guild);
  if (uninstallResult.error) return { error: uninstallResult.error, channelId: null };

  return installVerification(guild);
}

/**
 * Checks whether verification is currently enabled for a guild.
 */
export async function isVerificationEnabled(guildId) {
  const settings = await getModuleSettings(guildId, MODULE_KEY);
  return settings.enabled === true;
}

/**
 * On member join, assign the 🆕 New Member role automatically.
 */
export async function assignNewMemberRole(member) {
  try {
    const settings = await getModuleSettings(member.guild.id, MODULE_KEY);
    if (!settings.enabled) return;

    const role = getNewMemberRole(member.guild);
    if (!role) {
      logger.warn(`New Member role not found for guild ${member.guild.id}.`);
      return;
    }

    await member.roles.add(role, 'Automatic role on join (Verification module).');
    logger.info(`Assigned "${role.name}" to ${member.user.tag} in guild ${member.guild.id}.`);
  } catch (error) {
    logger.error(`Failed to assign New Member role to ${member.user.tag}:`, error);
  }
}

/**
 * Completes verification for a user:
 * 1. Removes 🆕 New Member.
 * 2. Grants 👌 Verified Member.
 * 3. Stores the OAuth2 token + Discord ID in the database.
 */
export async function completeVerification(guild, member, oauth2Token, oauth2Refresh) {
  const verifiedRole = getVerifiedMemberRole(guild);
  const newMemberRole = getNewMemberRole(guild);

  if (verifiedRole) {
    await member.roles.add(verifiedRole, 'OAuth2 verification completed.');
  }

  if (newMemberRole) {
    await member.roles.remove(newMemberRole, 'OAuth2 verification completed.');
  }

  // Upsert the verified user record
  await query(
    `
    INSERT INTO verified_users (guild_id, discord_id, oauth2_token, oauth2_refresh)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (guild_id, discord_id)
    DO UPDATE SET oauth2_token = EXCLUDED.oauth2_token,
                  oauth2_refresh = COALESCE(EXCLUDED.oauth2_refresh, verified_users.oauth2_refresh),
                  verified_at = now()
    `,
    [guild.id, member.id, oauth2Token, oauth2Refresh ?? null],
  );

  logger.success(`User ${member.user.tag} verified in guild ${guild.id}.`);
}

/**
 * Retrieves all verified users for a given guild.
 */
export async function getVerifiedUsers(guildId) {
  const result = await query(
    'SELECT discord_id, oauth2_token, oauth2_refresh, verified_at FROM verified_users WHERE guild_id = $1 ORDER BY verified_at DESC',
    [guildId],
  );
  return result.rows;
}