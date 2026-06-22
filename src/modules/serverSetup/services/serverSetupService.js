import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ROLES } from '../config/roles.js';
import { CATEGORIES } from '../config/channels.js';
import {
  findRole,
  findCategory,
  findChannel,
  safeDeleteRole,
  safeDeleteChannel,
  createIfMissing,
} from '../utils/serverSetupUtils.js';
import { resolveChannelPermissions, buildVisibilityPermissions, buildVerifyPermissions } from './permissionService.js';
import { logger } from '../../../shared/logger.js';
import { ValidationError } from '../../../shared/errors.js';

/**
 * Deletes every channel in the guild (categories, text, announcement,
 * voice, forum, stage). Each deletion is independent — one failure does
 * not stop the rest.
 */
export async function deleteChannels(guild) {
  await guild.channels.fetch();
  const channels = [...guild.channels.cache.values()];

  let deleted = 0;
  let errors = 0;

  for (const channel of channels) {
    const success = await safeDeleteChannel(channel);
    if (success) {
      deleted += 1;
      logger.info(`Deleted channel "${channel.name}".`);
    } else {
      errors += 1;
    }
  }

  logger.info(`deleteChannels finished — deleted: ${deleted}, errors: ${errors}.`);
  return { deleted, errors };
}

/**
 * Deletes every deletable role in the guild. Never touches @everyone,
 * managed/integration roles, or roles at/above the bot's highest role.
 */
export async function deleteRoles(guild) {
  await guild.roles.fetch();
  const roles = [...guild.roles.cache.values()];
  const botHighestPosition = guild.members.me?.roles.highest.position ?? 0;

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const role of roles) {
    if (role.id === guild.id) continue; // @everyone

    if (role.managed) {
      logger.warn(`Skipped role "${role.name}" (managed/integration role).`);
      skipped += 1;
      continue;
    }

    if (role.position >= botHighestPosition) {
      logger.warn(`Skipped role "${role.name}" (at or above the bot's highest role).`);
      skipped += 1;
      continue;
    }

    const success = await safeDeleteRole(role);
    if (success) {
      deleted += 1;
      logger.info(`Deleted role "${role.name}".`);
    } else {
      errors += 1;
    }
  }

  logger.info(`deleteRoles finished — deleted: ${deleted}, skipped: ${skipped}, errors: ${errors}.`);
  return { deleted, skipped, errors };
}

/** Creates every role from config/roles.js that doesn't already exist. */
export async function createRoles(guild) {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const roleDef of ROLES) {
    try {
      const { created: wasCreated } = await createIfMissing({
        find: () => findRole(guild, roleDef.name),
        create: () =>
          guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: roleDef.hoist ?? false,
            mentionable: roleDef.mentionable ?? false,
            permissions: (roleDef.permissions ?? []).map((key) => PermissionFlagsBits[key]),
          }),
      });

      if (wasCreated) {
        created += 1;
        logger.success(`Created role "${roleDef.name}".`);
      } else {
        skipped += 1;
        logger.info(`Skipped role "${roleDef.name}" (already exists).`);
      }
    } catch (error) {
      errors += 1;
      logger.error(`Failed to create role "${roleDef.name}":`, error);
    }
  }

  logger.info(`createRoles finished — created: ${created}, skipped: ${skipped}, errors: ${errors}.`);
  return { created, skipped, errors };
}

/**
 * Creates every category from config/channels.js that doesn't already
 * exist. Returns a categoryMap (name -> CategoryChannel) so createChannels
 * knows where to put each channel.
 */
export async function createCategories(guild) {
  const categoryMap = new Map();
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const categoryDef of CATEGORIES) {
    try {
      const overwrites = buildVisibilityPermissions(guild, categoryDef.visibility);

      const { item: category, created: wasCreated } = await createIfMissing({
        find: () => findCategory(guild, categoryDef.name),
        create: () =>
          guild.channels.create({
            name: categoryDef.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: overwrites,
          }),
      });

      categoryMap.set(categoryDef.name, category);

      if (wasCreated) {
        created += 1;
        logger.success(`Created category "${categoryDef.name}".`);
      } else {
        skipped += 1;
        logger.info(`Skipped category "${categoryDef.name}" (already exists).`);
      }
    } catch (error) {
      errors += 1;
      logger.error(`Failed to create category "${categoryDef.name}":`, error);
    }
  }

  logger.info(`createCategories finished — created: ${created}, skipped: ${skipped}, errors: ${errors}.`);
  return { categoryMap, created, skipped, errors };
}

/**
 * Creates every channel from config/channels.js inside its category, in
 * order, then creates the standalone Verify channel. Requires a
 * categoryMap from createCategories(). A channel whose category failed
 * to create is skipped (logged) rather than crashing. `type` is passed
 * straight through as a real ChannelType enum value — no string mapping
 * layer to fall out of sync with discord.js.
 */
export async function createChannels(guild, categoryMap) {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const categoryDef of CATEGORIES) {
    const category = categoryMap.get(categoryDef.name);
    if (!category) {
      logger.warn(`Skipping channels for "${categoryDef.name}" — category was not created.`);
      continue;
    }

    for (const channelDef of categoryDef.channels) {
      try {
        if (typeof channelDef.type !== 'number') {
          throw new ValidationError(
            `Channel "${channelDef.name}" has an invalid type — use a ChannelType enum value, e.g. ChannelType.GuildText.`
          );
        }

        const overwrites = resolveChannelPermissions(guild, {
          visibility: categoryDef.visibility,
          permissionKey: channelDef.permissionKey,
          readOnly: channelDef.readOnly,
        });

        const { created: wasCreated } = await createIfMissing({
          find: () => findChannel(guild, channelDef.name, category.id),
          create: () =>
            guild.channels.create({
              name: channelDef.name,
              type: channelDef.type,
              parent: category.id,
              topic: channelDef.topic,
              permissionOverwrites: overwrites,
            }),
        });

        if (wasCreated) {
          created += 1;
          logger.success(`Created channel "${channelDef.name}".`);
        } else {
          skipped += 1;
          logger.info(`Skipped channel "${channelDef.name}" (already exists).`);
        }
      } catch (error) {
        errors += 1;
        logger.error(`Failed to create channel "${channelDef.name}":`, error);
      }
    }
  }

  logger.info(`createChannels finished — created: ${created}, skipped: ${skipped}, errors: ${errors}.`);
  return { created, skipped, errors };
}

/**
 * Orchestrates the whole /setup command. Runs only the actions whose
 * corresponding option is true, in a fixed, safe order: delete channels,
 * delete roles, create roles, create categories + channels. Returns an
 * aggregate summary for the slash command embed.
 */
export async function setupServer(guild, options) {
  const startedAt = Date.now();

  const summary = {
    channelsDeleted: 0,
    rolesDeleted: 0,
    rolesCreated: 0,
    rolesSkipped: 0,
    categoriesCreated: 0,
    categoriesSkipped: 0,
    channelsCreated: 0,
    channelsSkipped: 0,
    errors: 0,
    durationMs: 0,
  };

  if (options.deleteChannels) {
    const result = await deleteChannels(guild);
    summary.channelsDeleted = result.deleted;
    summary.errors += result.errors;
  }

  if (options.deleteRoles) {
    const result = await deleteRoles(guild);
    summary.rolesDeleted = result.deleted;
    summary.errors += result.errors;
  }

  if (options.createRoles) {
    const result = await createRoles(guild);
    summary.rolesCreated = result.created;
    summary.rolesSkipped = result.skipped;
    summary.errors += result.errors;
  }

  if (options.createChannels) {
    const categoryResult = await createCategories(guild);
    summary.categoriesCreated = categoryResult.created;
    summary.categoriesSkipped = categoryResult.skipped;
    summary.errors += categoryResult.errors;

    const channelResult = await createChannels(guild, categoryResult.categoryMap);
    summary.channelsCreated = channelResult.created;
    summary.channelsSkipped = channelResult.skipped;
    summary.errors += channelResult.errors;
  }

  summary.durationMs = Date.now() - startedAt;

  return summary;
}
