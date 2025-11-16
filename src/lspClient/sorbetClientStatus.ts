export const enum SorbetClientStatus {
  Disabled = 'Disabled',
  // The language client is initializing.
  Initializing = 'Initializing',
  // The language client is running, and so is Sorbet.
  Running = 'Running',
  // An error has occurred. The user must dismiss the error.
  Error = 'Error',
}
