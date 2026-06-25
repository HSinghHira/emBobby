/**
 * Centralised configuration for the Backup module.
 *
 * Defines the role names that represent "staff" so that when restoring
 * a backup the module knows which users to grant elevated permissions to.
 * The backup module stores a full JSON snapshot of the source server's
 * channels, categories, roles, and permissions, then replays them on
 * the target guild when /clone is invoked.
 */
export const BACKUP_CONFIG = {
  /** Names of roles the bot treats as "administrative" during backup/restore. */
  staffRoleNames: ['👑 Owner', '🛡️ Senior Mod', '🛡️ Junior Mod', '🛡️ Trial Mod'],

  /** Key used in guild_settings.settings for the backup module. */
  settingsKey: 'backup',
};