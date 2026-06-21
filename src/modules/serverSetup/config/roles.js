/**
 * Role definitions for the server setup module.
 *
 * Roles are created in array order. Discord stacks newly created roles
 * above existing ones, so list higher-authority roles LAST if you want
 * them to end up closer to the top of the role list.
 *
 * EDIT THIS LIST with your actual server's roles — these are placeholders.
 *
 * Fields:
 *   name        - exact role name. Also used to resolve permissionKey ->
 *                 role in permissions.js, so keep these names in sync.
 *   color       - hex string, optional (default: Discord default grey)
 *   hoist       - show separately in the member list, optional (default: false)
 *   mentionable - whether non-staff can @mention it, optional (default: false)
 *   permissions - array of PermissionFlagsBits key names granted to the
 *                 role, optional (default: [])
 */
export const ROLES = [
  {
    name: 'Staff',
    color: '#ED4245',
    hoist: true,
    mentionable: true,
    permissions: ['ManageMessages', 'KickMembers', 'ManageNicknames'],
  },
  {
    name: 'Verified',
    color: '#57F287',
    hoist: false,
    mentionable: false,
    permissions: [],
  },
  {
    name: 'He/Him',
    color: '#5865F2',
    hoist: false,
    mentionable: false,
    permissions: [],
  },
  {
    name: 'She/Her',
    color: '#EB459E',
    hoist: false,
    mentionable: false,
    permissions: [],
  },
  {
    name: 'They/Them',
    color: '#FEE75C',
    hoist: false,
    mentionable: false,
    permissions: [],
  },
];
