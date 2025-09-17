export const LspConfigurationOptions = [
  'enableRbsSupport',
  'enableRequiresAncestor',
  'enableWatchman',
  'highlightUntypedCode',
  'highlightUntypedCodeDiagnosticSeverity',
  'restartFilePatterns',
  'typedFalseCompletionNudges',
] as const;

export type LspConfigurationOption = (typeof LspConfigurationOptions)[number];
