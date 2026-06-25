# emBobby — Discord Bot Setup Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Local Development)](#quick-start-local-development)
4. [Docker Deployment](#docker-deployment)
5. [Environment Variables](#environment-variables)
6. [Configuration](#configuration)
7. [Commands](#commands)
   - [`/setup` — Server Setup](#setup---server-setup)
8. [Events](#events)
9. [Modules](#modules)
   - [Logging Module](#logging-module)
   - [Server Setup Module](#server-setup-module)
10. [Project Structure](#project-structure)

---

## Overview

**emBobby** is a Discord bot built with [discord.js v14](https://discord.js.org/) and the [Bun](https://bun.sh/) runtime. It uses PostgreSQL for persistent storage and supports Docker-based production deployments.

The bot provides server management tools — namely the ability to mass-create and delete channels and roles from configuration, plus a built-in server logging system.

---

## Prerequisites

- **Node.js** (for Bun installation) or **Bun** runtime installed locally
- **PostgreSQL** database (or Docker for running Postgres in a container)
- A **Discord Application** created in the [Discord Developer Portal](https://discord.com/developers/applications)
- A **Discord Bot Token** and **Client ID** from your application

---

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/HSinghHira/emBobby.git
cd emBobby
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Discord credentials and database URL:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here    # optional — leave empty for global commands
DATABASE_URL=postgres://user:password@localhost:5432/embobby
```

> **Note:** `DISCORD_GUILD_ID` is optional. When set, commands register instantly for that guild only (useful during development). When blank, commands register globally, which can take up to an hour to propagate.

### 4. Start the bot

```bash
bun run start
```

Or for development with hot-reload:

```bash
bun run dev
```

---

## Docker Deployment

### Quick start with Docker Compose

```bash
# Create your .env file first (see Environment Variables section)
docker compose up -d
```

This starts two containers:
- **embobby** — the bot itself
- **embobby-db** — PostgreSQL 15 database

The database automatically runs health checks before the bot starts, and data is persisted in a Docker volume (`postgres_data`).

### Manual Docker build

```bash
docker build -t embobby .
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ Yes | Your Discord bot token from the Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ Yes | Your Discord application's client ID |
| `DISCORD_GUILD_ID` | ❌ No | Guild ID for instant command registration (dev only) |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |

When using Docker Compose, the `DATABASE_URL` is automatically constructed from the `POSTGRES_*` variables. You don't need to set `DATABASE_URL` in your `.env` for Docker — instead set:

```env
POSTGRES_USER=embobby
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=embobby
```

---

## Configuration

### Bot Behaviour (`src/config/bot.js`)

| Setting | Default | Description |
|---|---|---|
| `defaultCooldownSeconds` | `3` | Cooldown applied to commands without their own cooldown |
| `isGuildScoped` | auto | Commands register to the guild from `DISCORD_GUILD_ID` if set |
| `deleteConfigOnLeave` | `false` | Whether to delete guild config when the bot leaves a server |

These values are safe to edit directly — they are not tied to environment variables.

---

## Commands

Currently, emBobby exposes **one slash command**:

### `/setup` — Server Setup

Mass-create or delete server roles, channels, and logging from configuration.

**Permission required:** `Administrator`

**Cooldown:** 30 seconds

**Options:**

| Option | Choices | Description |
|---|---|---|
| `channels` | Install / Uninstall / Reinstall | Create, delete, or reinstall text and voice channels |
| `roles` | Install / Uninstall / Reinstall | Create, delete, or reinstall server roles |
| `logging` | Enable / Disable / Reinstall | Enable, disable, or reinstall the logging module |

**Usage examples:**

```bash
# Install both channels and roles in one command
/setup channels:Install roles:Install

# Delete channels and enable logging
/setup channels:Uninstall logging:Enable

# Reinstall everything (deletes and recreates channels, roles, and logging)
/setup channels:Reinstall roles:Reinstall logging:Reinstall

# Only enable logging (channels must already exist)
/setup logging:Enable

# Disable logging (removes the log channel)
/setup logging:Disable
```

**How it works:**

1. The bot defers the reply (since operations can take time).
2. Based on the options provided, it:
   - Creates or deletes **categories** (e.g. `📢 INFORMATION`, `🎮 CHAT`, etc.)
   - Creates or deletes **channels** within those categories
   - Creates or deletes **roles** (e.g. `Member`, `Admin`, `Moderator`, etc.)
   - Enables, disables, or reinstalls the **logging module** (creates/deletes the log channel)
3. After all operations complete, an **embed summary** is sent showing what was done.

> **Note:** If you choose `Reinstall` for channels/roles, the bot will first delete existing ones, then recreate them fresh. This is useful for resetting your server structure.

> **Note:** Enabling logging requires that channels (and specifically the logging category) already exist. Run `/setup channels:Install` first if setting up a new server.

---

## Events

emBobby listens for these Discord events:

| Event | File | Purpose |
|---|---|---|
| `ready` | `src/events/ready.js` | Fires once when the bot logs in. Syncs guild configurations for all servers the bot is in (handles guilds joined while offline). |
| `guildCreate` | `src/events/guildCreate.js` | Fires when the bot joins a new guild. Initializes a configuration record for that guild in the database. |
| `guildDelete` | `src/events/guildDelete.js` | Fires when the bot leaves a guild (or is kicked). Optionally deletes the guild's configuration record based on `botConfig.deleteConfigOnLeave`. |
| `interactionCreate` | `src/events/interactionCreate.js` | Fires on every user interaction. Routes slash commands, checks permissions and cooldowns, executes the command, and logs the usage to the guild's log channel. |

---

## Modules

### Logging Module

The logging module provides a centralized logging system for your Discord server. When enabled, it creates a dedicated text channel (e.g. `└server-logs`) under a specific category.

**Log levels and their visual style:**

| Level | Emoji | Color | Usage |
|---|---|---|---|
| `INFO` | 📘 | Blue | General information |
| `SUCCESS` | ✅ | Green | Successful operations |
| `WARN` | ⚠️ | Yellow/Orange | Warnings |
| `ERROR` | ❌ | Red | Errors |
| `MOD` | 🛡️ | Orange | Moderation actions (bans, kicks, mutes) |
| `ADMIN` | ⚙️ | Purple | Server management actions |
| `COMMAND` | 🔧 | Blue | Command usage logging |

**Automatic logging:**

- Every slash command usage is automatically logged to the guild's log channel (including the user, channel, and options used).
- Admin actions (like enabling/disabling logging via `/setup`) are logged as `ADMIN` entries.

**Programmatic API:**

Module consumers can import from `src/modules/logging/index.js`:

```js
import {
  logToChannel,          // Post a custom log entry
  logCommandUsage,       // Log a command execution
  logModerationAction,   // Log a moderation action (ban, kick, etc.)
  logAdminAction,        // Log an admin action
  enableLogging,         // Enable logging for a guild
  disableLogging,        // Disable logging for a guild
  reinstallLogging,      // Reinstall logging (delete and recreate channel)
  isLoggingEnabled,      // Check if logging is enabled
} from '../modules/logging/index.js';
```

### Server Setup Module

The server setup module handles mass creation and deletion of server channels and roles based on configuration files. It is the engine behind the `/setup` command.

**Exported functions:**

```js
import {
  setupServer,           // Orchestrates the full setup process
  deleteChannels,        // Delete configured channels
  deleteRoles,           // Delete configured roles
  createRoles,           // Create configured roles
  createChannels,        // Create configured channels and categories
  createCategories,      // Create category channels only
} from '../modules/serverSetup/index.js';
```

---

## Project Structure

```
embobby/
├── .env.example              # Example environment variables
├── .gitignore
├── docker-compose.yml        # Docker Compose for bot + PostgreSQL
├── Dockerfile                # Docker image for the bot
├── justfile                  # Just command runner (deploy shortcut)
├── package.json              # Dependencies and scripts
│
├── src/
│   ├── app.js                # Entry point — boot sequence
│   │
│   ├── config/
│   │   ├── bot.js            # Bot behaviour configuration
│   │   ├── constants.js      # Shared constants (colors, etc.)
│   │   └── env.js            # Environment variable validation and export
│   │
│   ├── core/
│   │   ├── client.js         # Discord client creation
│   │   ├── command.js        # Command definition helper
│   │   ├── commandLoader.js  # Loads command files into the client
│   │   ├── cooldownManager.js # Command cooldown enforcement
│   │   ├── errorHandler.js   # Interaction and process error handling
│   │   ├── eventLoader.js    # Loads event files into the client
│   │   └── registerCommands.js # Registers slash commands with Discord
│   │
│   ├── commands/
│   │   └── setup.js          # Exports the /setup command
│   │
│   ├── events/
│   │   ├── guildCreate.js    # Bot joins a guild
│   │   ├── guildDelete.js    # Bot leaves a guild
│   │   ├── interactionCreate.js # Slash command handler
│   │   └── ready.js          # Bot ready event
│   │
│   ├── modules/
│   │   ├── logging/          # Logging module
│   │   │   ├── index.js      # Public API
│   │   │   ├── config/       # Logging configuration
│   │   │   └── services/     # Logging service implementations
│   │   │
│   │   └── serverSetup/      # Server setup module
│   │       ├── index.js      # Public API
│   │       ├── setupCommand.js # /setup command definition
│   │       ├── config/       # Channel/role configuration
│   │       ├── embeds/       # Setup summary embed builder
│   │       ├── services/     # Server setup service implementations
│   │       └── utils/        # Utility functions
│   │
│   ├── services/
│   │   ├── database.js       # PostgreSQL connection pool
│   │   ├── guildConfigService.js # Guild configuration CRUD
│   │   └── migrations.js     # Database migration runner
│   │
│   └── shared/
│       ├── errors.js         # Custom error classes
│       └── logger.js         # Console logger utility
```

---

## Scripts

| Command | Description |
|---|---|
| `bun run start` | Start the bot in production mode |
| `bun run dev` | Start the bot with hot-reload for development |

---

## Need Help?

- Open an issue on the [GitHub repository](https://github.com/HSinghHira/emBobby)
- Ensure all required environment variables are set before running
- For Docker issues, verify Docker and Docker Compose are installed and running