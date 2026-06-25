import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../../../config/constants.js';

/**
 * Builds the "Server Setup Complete" embed from a setupServer() summary
 * and optional module summaries (logging, verification, backup).
 * Only shows lines for actions that were actually requested, so a run
 * that only created roles doesn't show "Channels Deleted: 0" noise.
 */
export function buildSetupSummaryEmbed(
  summary,
  options,
  loggingSummary,
  verificationSummary,
  backupSummary,
) {
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
      `✓ Categories Created: **${summary.categoriesCreated}** (skipped ${summary.categoriesSkipped})`,
    );
    lines.push(
      `✓ Channels Created: **${summary.channelsCreated}** (skipped ${summary.channelsSkipped})`,
    );
  }

  // Logging module summary
  if (loggingSummary) {
    const icon = loggingSummary.success ? '✓' : '✗';
    const actionLabel = `Logging ${loggingSummary.action}d`;
    if (loggingSummary.success) {
      lines.push(`${icon} ${actionLabel}: **Success**`);
    } else {
      lines.push(`${icon} ${actionLabel}: **Failed** — ${loggingSummary.error}`);
    }
  }

  // Verification module summary
  if (verificationSummary) {
    const icon = verificationSummary.success ? '✓' : '✗';
    const actionLabel = `Verification ${verificationSummary.action}ed`;
    if (verificationSummary.success) {
      const details = [];
      if (verificationSummary.rolesCreated !== undefined) {
        details.push(`Roles Created: ${verificationSummary.rolesCreated}`);
      }
      if (verificationSummary.rolesDeleted !== undefined) {
        details.push(`Roles Deleted: ${verificationSummary.rolesDeleted}`);
      }
      lines.push(`${icon} ${actionLabel}: **Success**${details.length ? ' (' + details.join(', ') + ')' : ''}`);
    } else {
      lines.push(`${icon} ${actionLabel}: **Failed** — ${verificationSummary.error}`);
    }
  }

  // Backup module summary
  if (backupSummary) {
    const icon = backupSummary.success ? '✓' : '✗';
    const actionLabel = `Backup ${backupSummary.action}d`;
    if (backupSummary.success) {
      const details = [];
      if (backupSummary.backupId !== undefined) {
        details.push(`Backup #${backupSummary.backupId}`);
      }
      lines.push(`${icon} ${actionLabel}: **Success**${details.length ? ' (' + details.join(', ') + ')' : ''}`);
    } else {
      lines.push(`${icon} ${actionLabel}: **Failed** — ${backupSummary.error}`);
    }
  }

  const hasErrors =
    summary.errors > 0 ||
    loggingSummary?.error != null ||
    verificationSummary?.error != null ||
    backupSummary?.error != null;

  return new EmbedBuilder()
    .setTitle('Server Setup Complete')
    .setColor(hasErrors ? COLORS.warning : COLORS.success)
    .setDescription(lines.join('\n') || 'No actions were selected.')
    .addFields(
      { name: 'Duration', value: `${(summary.durationMs / 1000).toFixed(1)}s`, inline: true },
      { name: 'Errors', value: `${summary.errors}`, inline: true },
    )
    .setTimestamp();
}