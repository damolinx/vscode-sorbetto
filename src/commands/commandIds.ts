import { EXTENSION_PREFIX } from '../constants';

/**
 * Run `bundle install`.
 */
export const BUNDLE_INSTALL_ID = `_${EXTENSION_PREFIX}.bundleInstall`;

/**
 * Copy Symbol to Clipboard.
 */
export const COPY_SYMBOL_ID = `${EXTENSION_PREFIX}.copySymbolToClipboard`;

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