const EXTENSION_PREFIX = 'sorbetto.';

/**
 * Copy Symbol to Clipboard.
 */
export const COPY_SYMBOL_COMMAND_ID = `${EXTENSION_PREFIX}copySymbolToClipboard`;

/**
 * Show available actions.
 */
export const SHOW_ACTIONS_COMMAND_ID = `${EXTENSION_PREFIX}showAvailableActions`;

/**
 * Show Sorbet Output panel.
 */
export const SHOW_OUTPUT_COMMAND_ID = `${EXTENSION_PREFIX}showOutput`;

/**
 * Save package files. This command name is required by Sorbet itself.
 */
export const SORBET_SAVE_PACKAGE_FILES_COMMAND_ID = 'sorbet.savePackageFiles';

/**
 * Restart Sorbet.
 */
export const SORBET_RESTART_COMMAND_ID = `${EXTENSION_PREFIX}restart`;

/**
 * Verify workspace.
 */
export const VERIFY_WORKSPACE_COMMAND_ID = `${EXTENSION_PREFIX}verify.workspace`;