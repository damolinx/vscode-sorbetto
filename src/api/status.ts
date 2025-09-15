import { LspStatus } from '../types';

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

export function mapStatus(status: LspStatus): SorbetStatus | undefined {
  switch (status) {
    case LspStatus.Disabled:
      return SorbetStatus.Disabled;
    case LspStatus.Error:
      return SorbetStatus.Error;
    case LspStatus.Initializing:
    case LspStatus.Restarting:
      return SorbetStatus.Start;
    case LspStatus.Running:
      return SorbetStatus.Running;
    default:
      return undefined;
  }
}
