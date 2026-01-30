import { EXTENSION_PREFIX } from './constants';

export const CommandIds = {
  /** Run `srb tc --autocorrect` */
  AutocorrectAll: `_${EXTENSION_PREFIX}.autocorrectAll`,

  /** Run `bundle install`. */
  BundleInstall: `_${EXTENSION_PREFIX}.bundleInstall`,

  /** Run `bundle update`. */
  BundleUpdate: `_${EXTENSION_PREFIX}.bundleUpdate`,

  /** Copy fully qualified name of symbol at cursor location to clipboard. */
  CopySymbol: `${EXTENSION_PREFIX}.copySymbol`,

  /** Debug a Ruby file. */
  DebugRubyFile: `${EXTENSION_PREFIX}.debugRubyFile`,

  /** Open Settings Editor appropriate for current workspace. */
  OpenSettings: `_${EXTENSION_PREFIX}.openSettings`,

  /** Peek hierarchy references of symbol at cursor location. */
  PeekHierarchyReferences: `${EXTENSION_PREFIX}.peekHierarchyReferences`,

  /** Run a Ruby file. */
  RunRubyFile: `${EXTENSION_PREFIX}.runRubyFile`,

  /** Send active selection to https://sorbet.run. */
  SendToSorbetRun: `${EXTENSION_PREFIX}.sendToSorbetRun`,

  /** Prepare workspace for Sorbet development. */
  SetupWorkspace: `${EXTENSION_PREFIX}.setup.workspace`,

  /** Show Sorbetto output panel. */
  ShowOutput: `_${EXTENSION_PREFIX}.showOutput`,

  /** Save package files. This specific command name is required by Sorbet itself. */
  SorbetSavePackageFiles: 'sorbet.savePackageFiles',

  /** Restart Sorbet. */
  SorbetRestart: `${EXTENSION_PREFIX}.restart`,

  /** Start Sorbet. */
  SorbetStart: `${EXTENSION_PREFIX}.start`,

  /** Stop Sorbet. */
  SorbetStop: `${EXTENSION_PREFIX}.stop`,

  /** Update RBIs. */
  UpdataRbis: `${EXTENSION_PREFIX}.updateRbis`,
} as const;

export type CommandId = (typeof CommandIds)[keyof typeof CommandIds];
