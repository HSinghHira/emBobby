/**
 * Maps a permission key (referenced from channels.js via `permissionKey`)
 * to the role(s) that should be able to SEE the channel.
 *
 * `denyEveryone: true` hides the channel from @everyone, so only the
 * listed role(s) in `allowRoles` can view it. `allowRoles` entries must
 * match a role `name` defined in config/roles.js exactly — the service
 * resolves the name to a live Role at setup time.
 *
 * Channels/categories with no permissionKey are left visible to everyone
 * (no overwrites applied).
 */
export const PERMISSIONS = {
  staff: {
    allowRoles: ['Staff'],
    denyEveryone: true,
  },
  verified: {
    allowRoles: ['Verified'],
    denyEveryone: true,
  },
  'he-only': {
    allowRoles: ['He/Him'],
    denyEveryone: true,
  },
  'she-only': {
    allowRoles: ['She/Her'],
    denyEveryone: true,
  },
  'they-only': {
    allowRoles: ['They/Them'],
    denyEveryone: true,
  },
};
