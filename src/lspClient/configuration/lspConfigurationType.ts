export const enum LspConfigurationType {
  /**
   * Sorbet is started with custom.
   */
  Custom = 'custom',
  /**
   * Sorbet should not be started.
   */
  Disabled = 'disabled',
  /**
   * Sorbet should be started in default configuration.
   */
  Stable = 'stable',
}
