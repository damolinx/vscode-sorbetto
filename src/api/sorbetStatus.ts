import { ServerStatus } from '../types';

/**
 * Status changes reported by extension.
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

export function mapStatus(status: ServerStatus): SorbetStatus | undefined {
  switch (status) {
    case ServerStatus.DISABLED:
      return SorbetStatus.Disabled;
    case ServerStatus.ERROR:
      return SorbetStatus.Error;
    case ServerStatus.INITIALIZING:
    case ServerStatus.RESTARTING:
      return SorbetStatus.Start;
    case ServerStatus.RUNNING:
      return SorbetStatus.Running;
    default:
      return undefined;
  }
}
