/**
 * Category/channel definitions for the server setup module.
 *
 * EDIT THIS LIST with your actual server's structure — these are placeholders.
 *
 * Categories are created first, in array order, then each category's
 * channels are created inside it, also in array order.
 *
 * Category fields:
 *   name          - category name
 *   permissionKey - optional, key from permissions.js. Applied to the
 *                   category and inherited by its channels unless a
 *                   channel sets its own permissionKey.
 *   channels      - array of channel definitions (below)
 *
 * Channel fields:
 *   name          - channel name
 *   type          - 'GuildText' | 'GuildAnnouncement' | 'GuildForum'
 *   topic         - optional channel topic
 *   permissionKey - optional, overrides the parent category's permissionKey
 *   readOnly      - optional boolean. When true, everyone who can VIEW the
 *                   channel is denied SendMessages / thread creation.
 */
export const CATEGORIES = [
  {
    name: 'Information',
    permissionKey: 'verified',
    channels: [
      { name: 'announcements', type: 'GuildAnnouncement', readOnly: true },
      { name: 'rules', type: 'GuildText', readOnly: true },
    ],
  },
  {
    name: 'General',
    permissionKey: 'verified',
    channels: [
      { name: 'general', type: 'GuildText' },
      { name: 'media', type: 'GuildText' },
      { name: 'help-desk', type: 'GuildForum' },
    ],
  },
  {
    name: 'Staff',
    permissionKey: 'staff',
    channels: [
      { name: 'staff-chat', type: 'GuildText' },
      { name: 'mod-log', type: 'GuildText', readOnly: true },
    ],
  },
];
