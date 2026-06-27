import 'dotenv/config';

const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DATABASE_URL',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_OAUTH2_REDIRECT',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/**
 * Raw, validated environment variables.
 * This is the only file that should read from `process.env` directly —
 * everything else imports from here or from the other config modules.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  guildId: process.env.DISCORD_GUILD_ID || null,

  databaseUrl: process.env.DATABASE_URL,

  oauthRedirectUri: process.env.DISCORD_OAUTH2_REDIRECT,
};