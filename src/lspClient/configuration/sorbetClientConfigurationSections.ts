/**
 *  All {@link SorbetClient client} configuration names (`sorbetto.«name»`).
 */
const ConfigurationKeys = {
  enableAllBetaLspFeatures: { lspOption: true, toggle: true },
  enableAllExperimentalLspFeatures: { lspOption: true, toggle: true },
  enablePackageSupport: { lspOption: true, toggle: true },
  enableRequiresAncestor: { lspOption: true, toggle: true },
  enableRbsSupport: { lspOption: true, toggle: true },
  enableWatchman: { lspOption: true },
  highlightUntypedCode: { lspOption: true },
  highlightUntypedCodeDiagnosticSeverity: { lspOption: true },
  restartFilePatterns: { lspOption: true },
  sorbetLspConfiguration: {},
  sorbetLspCustomConfiguration: {},
  sorbetTypecheckCommand: {},
  typedFalseCompletionNudges: { lspOption: true, toggle: true },
} as const;

/**
 * {@link SorbetClient Client} configuration name (`sorbetto.«name»`).
 */
export type ConfigurationKey = keyof typeof ConfigurationKeys;

/**
 * {@link SorbetClient Client} configuration name (`sorbetto.«name»`) with a `true` or `false` value.
 */
export type ToggleConfigurationKey = {
  [K in ConfigurationKey]: (typeof ConfigurationKeys)[K] extends { toggle: true } ? K : never;
}[ConfigurationKey];

/**
 * {@link SorbetClient Client} configuration name (`sorbetto.«name»`) that is a Sorbet LSP option.
 * These lead to restart the client on change.
 */
export type LspOptionConfigurationKey = {
  [K in ConfigurationKey]: (typeof ConfigurationKeys)[K] extends { lspOption: true } ? K : never;
}[ConfigurationKey];

/**
 * {@link SorbetClient Client} configuration names (`sorbetto.«name»`) that are Sorbet LSP options.
 */
export const LspOptionConfigurationKeys = Object.entries(ConfigurationKeys)
  .filter(([, value]) => (value as any).lspOption === true)
  .map(([key]) => key) as LspOptionConfigurationKey[];
