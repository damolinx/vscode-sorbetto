/**
 *  All {@link SorbetClient client} configuration setting names (`sorbetto.«name»`).
 */
const ConfigurationKeys = {
  enableAllBetaLspFeatures: { lspOption: true, toggle: true },
  enableAllExperimentalLspFeatures: { lspOption: true, toggle: true },
  enablePackageSupport: { lspOption: true, toggle: true },
  enableRequiresAncestor: { lspOption: true, toggle: true },
  enableRbsSupport: { lspOption: true, toggle: true },
  enableRubyfmt: { lspOption: true, toggle: true },
  enableWatchman: { lspOption: true },
  highlightUntypedCode: { lspOption: true },
  highlightUntypedCodeDiagnosticSeverity: { lspOption: true },
  maximumDiagnosticsCount: { lspOption: true },
  restartFilePatterns: { lspOption: true },
  rubyfmtPath: { lspOption: true },
  sorbetLspConfiguration: {},
  sorbetLspCustomConfiguration: {},
  sorbetTypecheckCommand: {},
  typedFalseCompletionNudges: { lspOption: true, toggle: true },
} as const;

/**
 * {@link SorbetClient Client} configuration setting name (`sorbetto.«name»`).
 */
export type ConfigurationKey = keyof typeof ConfigurationKeys;

/**
 *  Name of a configuration setting (`sorbetto.«name»`) with boolean state.
 */
export type ToggleConfigurationKey = {
  [K in ConfigurationKey]: (typeof ConfigurationKeys)[K] extends { toggle: true } ? K : never;
}[ConfigurationKey];

/**
 * Name of a configuration setting (`sorbetto.«name»`) that maps directly to
 * a Sorbet Language Server option.
 */
export type LspOptionConfigurationKey = {
  [K in ConfigurationKey]: (typeof ConfigurationKeys)[K] extends { lspOption: true } ? K : never;
}[ConfigurationKey];

/**
 * Names of configuration settings (`sorbetto.«name»`) that map directly to
 * Sorbet Language Server options. Changing any of these requires restarting
 * the {@link SorbetClient client}.
 */
export const LspOptionConfigurationKeys = Object.entries(ConfigurationKeys)
  .filter(([, value]) => (value as any).lspOption === true)
  .map(([key]) => key) as LspOptionConfigurationKey[];
