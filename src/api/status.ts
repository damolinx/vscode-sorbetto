import { SorbetClientStatus } from '../lspClient/sorbetClientStatus';

/**
 * Status reported by extension.
 */
export const enum SorbetStatus {
  /**
   * Sorbet Language Server has been disabled.
   */
  Disabled = 'disabled',
  /**
   * Sorbet Language Server encountered an error. This state does not correlate
   * to code typing errors.
   */
  Error = 'error',
  /**
   * Sorbet Language Server is running.
   */
  Running = 'running',
  /**
   * Sorbet server is being started. The event might repeat in case of error or
   * if the server was previously stopped.
   */
  Start = 'start',
}

export function mapStatus(status: SorbetClientStatus): SorbetStatus | undefined {
  switch (status) {
    case SorbetClientStatus.Disabled:
      return SorbetStatus.Disabled;
    case SorbetClientStatus.Error:
      return SorbetStatus.Error;
    case SorbetClientStatus.Initializing:
      return SorbetStatus.Start;
    case SorbetClientStatus.Running:
      return SorbetStatus.Running;
    default:
      return undefined;
  }
}
