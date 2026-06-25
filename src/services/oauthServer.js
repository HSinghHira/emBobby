import express from 'express';
import { exchangeCode, getUserInfo } from '../modules/verification/services/oauthService.js';
import { completeVerification } from '../modules/verification/services/verificationService.js';
import { logger } from '../shared/logger.js';

/**
 * OAuth2 Callback HTTP Server.
 *
 * Discord's OAuth2 flow redirects the user back to a public HTTP endpoint
 * after they authorize the application. This lightweight Express server
 * handles that callback on /auth/callback:
 *
 *   1. Receives the `code` (auth code) and `state` (guildId) from Discord.
 *   2. Exchanges the code for an access + refresh token.
 *   3. Fetches the user's Discord profile with the token.
 *   4. Finds the guild and member via the bot client.
 *   5. Removes 🆕 New Member, grants 👌 Verified Member, stores tokens.
 *   6. Shows the user a success/failure HTML page.
 *
 * The server starts in the bot process (app.js) so it has access to the
 * Discord client through a global reference or an in-memory store.
 */

let discordClient = null;

export function setDiscordClient(client) {
  discordClient = client;
}

export function createOAuthApp() {
  const app = express();

  app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      logger.warn('OAuth2 callback missing "code" parameter.');
      return res.status(400).send(
        htmlPage('Verification Failed', 'Missing authorization code. Please try again.', 'error'),
      );
    }

    if (!state) {
      logger.warn('OAuth2 callback missing "state" parameter (guildId).');
      return res.status(400).send(
        htmlPage('Verification Failed', 'Missing guild identifier. Please try again.', 'error'),
      );
    }

    const guildId = state;
    logger.info(`OAuth2 callback received for guild ${guildId}`);

    try {
      const tokens = await exchangeCode(code);
      if (!tokens) {
        return res.status(502).send(
          htmlPage('Verification Failed', 'Failed to exchange authorization code with Discord.', 'error'),
        );
      }

      const userInfo = await getUserInfo(tokens.access_token);
      if (!userInfo) {
        return res.status(502).send(
          htmlPage('Verification Failed', 'Failed to fetch your Discord profile.', 'error'),
        );
      }

      const discordId = userInfo.id;
      const username = userInfo.username;
      logger.info(`OAuth2 successful for ${username} (${discordId}) in guild ${guildId}`);

      if (!discordClient) {
        logger.error('Discord client is not available. Cannot complete verification.');
        return res.status(503).send(
          htmlPage('Verification Failed', 'Bot is not connected. Please try again later.', 'error'),
        );
      }

      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) {
        logger.warn(`Guild ${guildId} not found in client cache.`);
        return res.status(404).send(
          htmlPage('Verification Failed', 'Could not find the server. Make sure the bot is in it.', 'error'),
        );
      }

      let member;
      try {
        member = await guild.members.fetch(discordId);
      } catch {
        logger.warn(`Member ${discordId} not found in guild ${guildId} -- storing token only.`);
        const { query } = await import('./database.js');
        await query(
          `INSERT INTO verified_users (guild_id, discord_id, oauth2_token, oauth2_refresh)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (guild_id, discord_id)
           DO UPDATE SET oauth2_token = EXCLUDED.oauth2_token,
                         oauth2_refresh = COALESCE(EXCLUDED.oauth2_refresh, verified_users.oauth2_refresh),
                         verified_at = now()`,
          [guildId, discordId, tokens.access_token, tokens.refresh_token ?? null],
        );

        return res.send(
          htmlPage(
            'Verified!',
            `Your identity has been saved! You will receive the Verified Member role once you join the server.`,
            'success',
          ),
        );
      }

      await completeVerification(guild, member, tokens.access_token, tokens.refresh_token);
      logger.success(`User ${username} (${discordId}) verified in guild ${guild.name}.`);

      return res.send(
        htmlPage(
          'Verification Successful!',
          `You have been verified successfully! You now have the Verified Member role. You can close this page.`,
          'success',
        ),
      );
    } catch (error) {
      logger.error('OAuth2 callback error:', error);
      return res.status(500).send(
        htmlPage('Verification Failed', 'An unexpected error occurred. Please try again.', 'error'),
      );
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/', (_req, res) => {
    res.redirect('/health');
  });

  return app;
}

export function startOAuthServer(client) {
  setDiscordClient(client);

  const port = process.env.PORT || 3000;
  const app = createOAuthApp();

  app.listen(port, () => {
    logger.success(`OAuth2 callback server listening on port ${port}`);
    logger.info(`Callback URL: ${process.env.DISCORD_OAUTH2_REDIRECT || 'http://localhost:' + port + '/auth/callback'}`);
  });
}

function htmlPage(title, message, type) {
  const color = type === 'success' ? '#57f287' : '#ed4245';
  const icon = type === 'success' ? '\u2705' : '\u274C';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + title + ' - emBobby</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box;}\nbody{font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#1e1e2e;color:#cdd6f4;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;}\n.card{background:#313244;border-radius:12px;padding:40px;max-width:480px;width:100%;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);}\n.icon{font-size:48px;margin-bottom:16px;}\nh1{font-size:24px;margin-bottom:12px;color:' + color + ';}\np{font-size:16px;line-height:1.6;color:#bac2de;}\n</style>\n</head>\n<body>\n<div class="card">\n<div class="icon">' + icon + '</div>\n<h1>' + title + '</h1>\n<p>' + message + '</p>\n</div>\n</body>\n</html>';
}