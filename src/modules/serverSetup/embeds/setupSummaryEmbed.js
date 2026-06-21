import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../../../config/constants.js';

/**
 * Builds the "Server Setup Complete" embed from a setupServer() summary.
 * Only shows lines for actions that were actually requested, so a run
 * that only created roles doesn't show "Channels Deleted: 0" noise.
 */
export function buildSetupSummaryEmbed(summary, options) {
  const lines = [];

  if (options.deleteRoles) {
    lines.push(`✓ Roles Deleted: **${summary.rolesDeleted}**`);
  }
  if (options.deleteChannels) {
    lines.push(`✓ Channels Deleted: **${summary.channelsDeleted}**`);
  }
  if (options.createRoles) {
    lines.push(`✓ Roles Created: **${summary.rolesCreated}** (skipped ${summary.rolesSkipped})`);
  }
  if (options.createChannels) {
    lines.push(
      `✓ Categories Created: **${summary.categoriesCreated}** (skipped ${summary.categoriesSkipped})`
    );
    lines.push(`✓ Channels Created: **${summary.channelsCreated}** (skipped ${summary.channelsSkipped})`);
  }

  return new EmbedBuilder()
    .setTitle('Server Setup Complete')
    .setColor(summary.errors > 0 ? COLORS.warning : COLORS.success)
    .setDescription(lines.join('\n') || 'No actions were selected.')
    .addFields(
      { name: 'Duration', value: `${(summary.durationMs / 1000).toFixed(1)}s`, inline: true },
      { name: 'Errors', value: `${summary.errors}`, inline: true }
    )
    .setTimestamp();
}
