export const LspConfigurationOptions = [
  'enableRbsSupport',
  'enableWatchman',
  'highlightUntypedCode',
  'highlightUntypedCodeDiagnosticSeverity',
  'restartFilePatterns',
  'typedFalseCompletionNudges',
] as const;

export type LspConfigurationOption = (typeof LspConfigurationOptions)[number];
