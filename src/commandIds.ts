import { EXTENSION_PREFIX } from './constants';

/**
 * Run `srb tc --autocorrect`
 */
export const AUTOCORRECT_ALL_ID = `_${EXTENSION_PREFIX}.autocorrectAll`;

/**
 * Run `bundle install`.
 */
export const BUNDLE_INSTALL_ID = `_${EXTENSION_PREFIX}.bundleInstall`;

/**
 * Run `bundle update`.
 */
export const BUNDLE_UPDATE_ID = `_${EXTENSION_PREFIX}.bundleUpdate`;

/**
 * Copy fully qualified name of symbol at cursor location to clipboard.
 */
export const COPY_SYMBOL_ID = `${EXTENSION_PREFIX}.copySymbol`;

/**
 * Debug a Ruby file.
 */
export const DEBUG_RUBY_FILE_ID = `${EXTENSION_PREFIX}.debugRubyFile`;

/**
 * Open Settings Editor appropriate for current workspace.
 */
export const OPEN_SETTINGS_ID = `_${EXTENSION_PREFIX}.openSettings`;

/**
 * Peek hierarchy references of symbol at cursor location.
 */
export const PEEK_HIERARCHY_REFS_ID = `${EXTENSION_PREFIX}.peekHierarchyReferences`;

/**
 * Run a Ruby file.
 */
export const RUN_RUBY_FILE_ID = `${EXTENSION_PREFIX}.runRubyFile`;

/**
 * Send active selection to https://sorbet.run.
 */
export const SEND_TO_SORBETRUN_ID = `${EXTENSION_PREFIX}.sendToSorbetRun`;

/**
 * Prepare workspace for Sorbet development.
 */
export const SETUP_WORKSPACE_ID = `${EXTENSION_PREFIX}.setup.workspace`;

/**
 * Show Sorbetto output panel.
 */
export const SHOW_OUTPUT_ID = `_${EXTENSION_PREFIX}.showOutput`;

/**
 * Save package files. This specific command name is required by Sorbet itself.
 */
export const SORBET_SAVE_PACKAGE_FILES_ID = 'sorbet.savePackageFiles';

/**
 * Restart Sorbet.
 */
export const SORBET_RESTART_ID = `${EXTENSION_PREFIX}.restart`;

/**
 * Start Sorbet.
 */
export const SORBET_START_ID = `${EXTENSION_PREFIX}.start`;

/**
 * Stop Sorbet.
 */
export const SORBET_STOP_ID = `${EXTENSION_PREFIX}.stop`;

/**
 * Update RBIs.
 */
export const UPDATE_RBIS_ID = `${EXTENSION_PREFIX}.updateRbis`;
