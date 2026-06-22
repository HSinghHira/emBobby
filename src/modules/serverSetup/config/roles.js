/**
 * Role definitions for the server setup module.
 *
 * Listed top → bottom (index 0 ends up highest in the Discord role list,
 * since Discord stacks each newly created role above the ones before it —
 * the service creates these in array order, so position falls out naturally).
 *
 * Fields:
 *   name        - exact role name. Also referenced by name elsewhere
 *                 (STAFF_ROLE_NAMES below, GENDER_ROLES/VISIBILITY_ROLES
 *                 in permissions.js) — keep names in sync if you rename one.
 *   color       - hex string, optional
 *   hoist       - show separately in the member list, optional (default: false)
 *   mentionable - whether non-staff can @mention it, optional (default: false)
 */
export const ROLES = [
  // ── Administration ──────────────────────────────────────────
  { name: '👑 Owner', color: '#FFD700', hoist: true, mentionable: false },

  // ── Moderation ──────────────────────────────────────────────
  { name: '🛡️ Senior Mod', color: '#E74C3C', hoist: true, mentionable: true },
  { name: '🛡️ Junior Mod', color: '#E67E22', hoist: true, mentionable: true },
  { name: '🛡️ Trial Mod', color: '#F39C12', hoist: true, mentionable: true },

  // ── Community ───────────────────────────────────────────────
  { name: '💝 Booster', color: '#FF73FA', hoist: false, mentionable: false },
  { name: '💎 VIP', color: '#1ABC9C', hoist: false, mentionable: false },
  { name: '⭐ OG', color: '#F1C40F', hoist: false, mentionable: false },

  // ── Pronouns ────────────────────────────────────────────────
  { name: '♂️ 𝐇𝐄┃𝐇𝐈𝐌', color: '#3498DB', hoist: false, mentionable: false },
  { name: '♀️ 𝐒𝐇𝐄┃𝐇𝐄𝐑', color: '#E91E63', hoist: false, mentionable: false },
  { name: '🌈 𝐓𝐇𝐄𝐘┃𝐓𝐇𝐄𝐌', color: '#9B59B6', hoist: false, mentionable: false },

  // ── Verified Gender ─────────────────────────────────────────
  { name: '🚹 Verified Male', color: '#5DADE2', hoist: false, mentionable: false },
  { name: '🚺 Verified Female', color: '#F1948A', hoist: false, mentionable: false },

  // ── Interest Tags ─────────────────────────────────────────────
  { name: '🎮 Gamer', color: '#8E44AD', hoist: false, mentionable: false },
  { name: '🎶 Music Lover', color: '#16A085', hoist: false, mentionable: false },
  { name: '😺 Anime', color: '#E74C3C', hoist: false, mentionable: false },
  { name: '🍿 Movies', color: '#E67E22', hoist: false, mentionable: false },
  { name: '🧑‍💻 Coding', color: '#27AE60', hoist: false, mentionable: false },

  // ── Notification Pings ────────────────────────────────────────
  { name: '🔔 Announcements Ping', color: '#F39C12', hoist: false, mentionable: true },
  { name: '🔔 Events Ping', color: '#F39C12', hoist: false, mentionable: true },
  { name: '🔔 Giveaways Ping', color: '#F39C12', hoist: false, mentionable: true },
  { name: '🔔 Voice Ping', color: '#F39C12', hoist: false, mentionable: true },

  // ── System / Utility ───────────────────────────────────────────
  { name: '🤖 Bot', color: '#7F8C8D', hoist: false, mentionable: false },
  { name: '🔇 Muted', color: '#95A5A6', hoist: false, mentionable: false },
];

/**
 * Role names treated as "staff" by the permission service — staff always
 * get view (and, on read-only channels, send) access regardless of a
 * category's visibility tier.
 */
export const STAFF_ROLE_NAMES = ['👑 Owner', '🛡️ Senior Mod', '🛡️ Junior Mod', '🛡️ Trial Mod'];
