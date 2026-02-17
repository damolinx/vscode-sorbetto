import { EXTENSION_PREFIX } from './constants';

export const CommandIds = {
  /** Run `srb tc --autocorrect` */
  AutocorrectAll: `${EXTENSION_PREFIX}.autocorrectAll`,

  /** Run `bundle install`. */
  BundleInstall: `_${EXTENSION_PREFIX}.bundleInstall`,

  /** Run `bundle update`. */
  BundleUpdate: `_${EXTENSION_PREFIX}.bundleUpdate`,

  /** Copy fully qualified name of symbol at cursor location to clipboard. */
  CopySymbol: `${EXTENSION_PREFIX}.copySymbol`,

  /** Create a __package.rb file. */
  CreatePackage: `_${EXTENSION_PREFIX}.createPackage`,

  /** Debug a Ruby file. */
  DebugRubyFile: `${EXTENSION_PREFIX}.debugRubyFile`,

  /** Open __package.rb appropriate for current file. */
  OpenPackage: `${EXTENSION_PREFIX}.openPackage`,

  /** Open Settings Editor appropriate for current workspace. */
  OpenSettings: `_${EXTENSION_PREFIX}.openSettings`,

  /** Peek hierarchy references of symbol at cursor location. */
  PeekHierarchyReferences: `${EXTENSION_PREFIX}.peekHierarchyReferences`,

  /** Run a Ruby file. */
  RunRubyFile: `${EXTENSION_PREFIX}.runRubyFile`,

  /** Save package files. */
  SavePackageFiles: `${EXTENSION_PREFIX}.savePackageFiles`,

  /** Send active selection to https://sorbet.run. */
  SendToSorbetRun: `${EXTENSION_PREFIX}.sendToSorbetRun`,

  /** Prepare workspace for Sorbet development. */
  SetupWorkspace: `${EXTENSION_PREFIX}.setup.workspace`,

  /** Show Sorbet Client actions . */
  ShowClientActions: `_${EXTENSION_PREFIX}.showClientActions`,

  /** Show log output panel. */
  ShowOutput: `_${EXTENSION_PREFIX}.showOutput`,

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
