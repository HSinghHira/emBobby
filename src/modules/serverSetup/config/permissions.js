/**
 * Maps permission concepts used in config/channels.js to role NAMES.
 * The permission service (services/permissionService.js) resolves these
 * names to live Role objects at setup time — role names are never
 * hardcoded inside the service itself, only here.
 */

/**
 * Role(s) granted view access for each non-staff visibility tier.
 * 'staff' needs no entry here — STAFF_ROLE_NAMES (config/roles.js)
 * covers it, and staff always get view access regardless of tier.
 * 'public' needs no entry either — @everyone is simply allowed to view.
 */
export const VISIBILITY_ROLES = {
  verified: ['👌 Verified Member'],
};

/**
 * Role-restricted channels: a channel's `permissionKey` selects one of these
 * and becomes visible ONLY to that role (overriding the category's
 * visibility tier entirely).
 */
export const GENDER_ROLES = {
  'he-only': '♂️ 𝐇𝐄┃𝐇𝐈𝐌',
  'she-only': '♀️ 𝐒𝐇𝐄┃𝐇𝐄𝐑',
  'they-only': '🌈 𝐓𝐇𝐄𝐘┃𝐓𝐇𝐄𝐌',
  'verified-only': '👌 Verified Member',
};

/** Role that can see (but not yet write in) the standalone Verify channel. */
export const VERIFY_GATE_ROLE = '🆕 New Member';