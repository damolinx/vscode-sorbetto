import { EXTENSION_PREFIX } from '../constants';

/**
 * Run `srb tc --autocorrect`
 */
export const AUTOCORRECT_ALL_ID = `_${EXTENSION_PREFIX}.autocorrectAll`;

/**
 * Run `bundle install`.
 */
export const BUNDLE_INSTALL_ID = `_${EXTENSION_PREFIX}.bundleInstall`;

/**
 * Copy Symbol to Clipboard.
 */
export const COPY_SYMBOL_ID = `${EXTENSION_PREFIX}.copySymbolToClipboard`;

/**
 * Debug a Ruby file.
 */
export const DEBUG_RUBY_FILE_ID = `${EXTENSION_PREFIX}.debugRubyFile`;

/**
 * Open Settings, multi-root workspace supported.
 */
export const OPEN_SETTINGS_ID = `_${EXTENSION_PREFIX}.openSettings`;

/**
 * Run a Ruby file.
 */
export const RUN_RUBY_FILE_ID = `${EXTENSION_PREFIX}.runRubyFile`;

/**
 * Setup workspace.
 */
export const SETUP_WORKSPACE_ID = `${EXTENSION_PREFIX}.setup.workspace`;

/**
 * Show Sorbet Output panel.
 */
export const SHOW_OUTPUT_ID = `_${EXTENSION_PREFIX}.showOutput`;

/**
 * Save package files. This command name is required by Sorbet itself.
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
