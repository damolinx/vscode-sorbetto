export const enum LspConfigurationType {
  /**
   * Sorbet is started with the `--enable-all-beta-lsp-features` flag.
   */
  Beta = 'beta',
  /**
   * Sorbet is started with custom.
   */
  Custom = 'custom',
  /**
   * Sorbet should not be started.
   */
  Disabled = 'disabled',
  /**
   * Sorbet is started with the `--enable-all-experimental-lsp-features` flag.
   */
  Experimental = 'experimental',
  /**
   * Sorbet should be started in default configuration.
   */
  Stable = 'stable',
}