/**
 * @deprecated
 * This bridge file is no longer needed.
 *
 * The `setup` command is now registered automatically by the dynamic
 * module loader (src/core/moduleLoader.js) which discovers the
 * serverSetup module at startup and registers its commands directly.
 *
 * You can safely delete this file. It is kept only to avoid breaking
 * any existing imports, but the module loader handles everything.
 *
 * See: src/modules/serverSetup/index.js (default export)
 */