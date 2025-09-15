// Reasons why Sorbet might be restarted.
export enum RestartReason {
  // Command manually invoked from command palette
  COMMAND = 'command',
  // For environments where a wrapper script protects the `sorbet` invocation,
  // and fails to start it under certain circumstances (for example, an rsync
  // client not running in the background, or a VPN not being connected).
  WRAPPER_REFUSED_SPAWN = 'wrapper_refused_spawn',
  // For situations where `sorbet` died because it was sent the TERM signal
  FORCIBLY_TERMINATED = 'forcibly_terminated',
  // LanguageClient closed callback
  CRASH_LC_CLOSED = 'crash_lc_closed',
  // LanguageClient error callback
  CRASH_LC_ERROR = 'crash_lc_error',
  // Extension (non-LanguageClient) error
  CRASH_EXT_ERROR = 'crash_ext_error',
  CONFIG_CHANGE = 'config_change',
  TRIGGER_FILES = 'trigger_files',
}

export const enum LspStatus {
  Disabled = 'Disabled',
  // The language client is restarting.
  Restarting = 'Restarting',
  // The language client is initializing.
  Initializing = 'Initializing',
  // The language client is running, and so is Sorbet.
  Running = 'Running',
  // An error has occurred. The user must dismiss the error.
  Error = 'Error',
}
