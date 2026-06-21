# emBobby – Project Context & Development Rules

We are building **emBobby**, a brand new Discord bot from scratch.

This is **not** a refactor of an old project. Ignore any previous codebase or architecture. We are creating a clean, production-ready project with long-term maintainability in mind.

---

# Project Goal

Build a modern, modular, scalable Discord bot that can easily support many features without becoming difficult to maintain.

The bot should be suitable for large Discord servers while remaining simple to extend.

The philosophy is:

* Build slowly.
* Build correctly.
* Finish one module before starting another.
* Never generate code that is not currently needed.
* Avoid unnecessary abstractions and premature optimization.

---

# Technology Stack

* Node.js
* Bun (package manager and runtime)
* Discord.js (latest stable version)
* PostgreSQL
* Slash Commands only

---

# Current Project Status

The project foundation already exists.

Current `src` structure:

```text
src/
├── app.js
├── commands/
│   └── setup.js
├── config/
│   └── env.js
├── core/
│   ├── client.js
│   ├── commandLoader.js
│   ├── eventLoader.js
│   └── registerCommands.js
├── events/
│   ├── interactionCreate.js
│   └── ready.js
├── interactions/
├── services/
│   └── database.js
└── shared/
    └── logger.js
```

The bot currently starts correctly, connects to Discord and PostgreSQL, registers slash commands, and includes a basic `/setup` command that replies:

> The bot is working.

Do **not** rebuild this foundation unless specifically requested.

---

# Architecture Principles

The project should remain simple and organized.

High-level structure:

```text
src/
├── commands/
├── config/
├── core/
├── events/
├── interactions/
├── services/
└── shared/
```

Rules:

* Every file should have a single responsibility.
* Avoid duplicate code.
* Avoid duplicate utilities.
* Do not create placeholder modules.
* Do not create unused files.
* Do not over-engineer solutions.
* Keep dependencies minimal.
* Write production-quality code.

---

# Development Philosophy

We will build **one feature at a time**.

Every new feature should be:

* Designed
* Implemented
* Tested
* Completed

before moving to the next feature.

Do not generate code for future modules.

---

# Planned Development Order

The expected order is:

1. Improve the core foundation (configuration, logger, database, error handling, command standards).
2. Create a Guild Configuration System.
3. Build a modular Setup System.
4. Add modules one by one.

Current planned modules include:

* Setup
* Logging
* Welcome
* Verification
* Voice Channels
* Tickets
* Moderation
* Reaction Roles
* Server Statistics
* Utility Commands

Additional modules may be added later.

---

# Module Philosophy

Every feature should be self-contained.

Modules should expose a consistent interface so the Setup system can manage them.

For example, a module may expose methods such as:

* install()
* uninstall()
* reinstall()
* healthCheck()

The Setup system should call these methods instead of containing module-specific logic.

This keeps the architecture modular and easy to extend.

---

# Important Rules for Future Responses

When helping with this project:

* Only modify files related to the requested feature.
* Do not refactor unrelated code.
* Do not move files unless requested.
* Do not redesign the architecture without discussion.
* Preserve backwards compatibility whenever possible.
* Explain architectural decisions before implementing large changes.
* Keep AI responses focused to minimize unnecessary token usage.

If there are multiple possible approaches, recommend the simplest maintainable solution rather than the most complex one.

Our goal is to build **emBobby** into a clean, maintainable, production-ready Discord bot by progressing incrementally, one completed module at a time.
