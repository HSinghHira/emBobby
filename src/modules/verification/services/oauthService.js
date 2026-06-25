import { env } from '../../../config/env.js';
import { logger } from '../../../shared/logger.js';

/**
 * OAuth2 Service for the Verification module.
 *
 * Handles Discord OAuth2 token exchange, refresh, and user-info
 * retrieval. The actual HTTP endpoints are Discord's documented
 * OAuth2 API — no external dependencies beyond Node's built-in
 * fetch (available globally since Node 18 / Discord.js v14).
 *
 * ── Environment Variables Required ────────────────────────────
 *   DISCORD_CLIENT_ID      – Already present in env.js
 *   DISCORD_CLIENT_SECRET  – Must be added to .env
 *   DISCORD_OAUTH2_REDIRECT – OAuth2 callback URL
 *
 * Scopes used:
 *   identify – read the user's Discord profile (id, username, avatar)
 *   guilds.join – add the user to the guild via the OAuth2 token
 */

/**
 * Discord OAuth2 token endpoint.
 */
const TOKEN_ENDPOINT = 'https://discord.com/api/v10/oauth2/token';

/**
 * Discord OAuth2 user-info endpoint.
 */
const USER_INFO_ENDPOINT = 'https://discord.com/api/v10/users/@me';

/**
 * Builds the OAuth2 authorization URL that users visit to grant access.
 *
 * @param {string} guildId – The guild ID for state validation.
 * @returns {string} The full Discord OAuth2 URL.
 */
export function buildOAuthUrl(guildId) {
  const clientId = env.clientId;
  const redirectUri = process.env.DISCORD_OAUTH2_REDIRECT || 'http://localhost:3000/auth/discord/callback';

  const url = new URL('https://discord.com/api/v10/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds.join');
  url.searchParams.set('state', guildId);

  return url.toString();
}

/**
 * Exchanges an OAuth2 authorization code for an access + refresh token.
 *
 * @param {string} code – The authorization code from Discord's callback.
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}|null>}
 */
export async function exchangeCode(code) {
  const clientId = env.clientId;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_OAUTH2_REDIRECT || 'http://localhost:3000/auth/discord/callback';

  if (!clientSecret) {
    logger.error('DISCORD_CLIENT_SECRET is not set. OAuth2 token exchange cannot proceed.');
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OAuth2 token exchange failed (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    logger.error('OAuth2 token exchange network error:', error);
    return null;
  }
}

/**
 * Refreshes an expired OAuth2 token.
 *
 * @param {string} refreshToken – The refresh token to use.
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}|null>}
 */
export async function refreshToken(refreshToken) {
  const clientId = env.clientId;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientSecret) {
    logger.error('DISCORD_CLIENT_SECRET is not set. Token refresh cannot proceed.');
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OAuth2 token refresh failed (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in,
    };
  } catch (error) {
    logger.error('OAuth2 token refresh network error:', error);
    return null;
  }
}

/**
 * Fetches the Discord user object associated with a valid access token.
 *
 * @param {string} accessToken – A valid OAuth2 access token.
 * @returns {Promise<{id: string, username: string, discriminator: string, avatar: string}|null>}
 */
export async function getUserInfo(accessToken) {
  try {
    const response = await fetch(USER_INFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      logger.error(`OAuth2 user-info request failed (${response.status}).`);
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('OAuth2 user-info network error:', error);
    return null;
  }
}

/**
 * Adds a user to a guild using an OAuth2 token with the `guilds.join` scope.
 * This is used during /clone to re-add verified members to the new server.
 *
 * @param {string} guildId – The target guild ID.
 * @param {string} userId – The Discord user ID to add.
 * @param {string} accessToken – OAuth2 token with guilds.join scope.
 * @returns {Promise<boolean>} – Whether the add was successful.
 */
export async function addMemberToGuild(guildId, userId, accessToken) {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      },
    );

    if (response.ok || response.status === 201 || response.status === 204) {
      logger.info(`Added user ${userId} to guild ${guildId} via OAuth2.`);
      return true;
    }

    if (response.status === 204) {
      // 204 means already a member — that's fine
      logger.info(`User ${userId} is already a member of guild ${guildId}.`);
      return true;
    }

    const errorText = await response.text();
    logger.warn(`Failed to add user ${userId} to guild ${guildId}: ${response.status} ${errorText}`);
    return false;
  } catch (error) {
    logger.error(`Network error adding user ${userId} to guild ${guildId}:`, error);
    return false;
  }
}