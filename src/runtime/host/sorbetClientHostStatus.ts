import { SorbetClientSessionStatus } from '../session/sorbetClientSessionStatus';

export const enum SorbetClientHostStatus {
  // An error has occurred. The user must dismiss the error.
  Disabled = 'Disabled',
  // The language client has run into an error.
  Error = 'Error',
  // The language client is initializing.
  Initializing = 'Initializing',
  // The language client is running, and so is Sorbet.
  Running = 'Running',
}

export function convertToClientHostStatus(
  sessionStatus: SorbetClientSessionStatus,
): SorbetClientHostStatus {
  switch (sessionStatus) {
    case SorbetClientSessionStatus.Initializing:
      return SorbetClientHostStatus.Initializing;

    case SorbetClientSessionStatus.Running:
      return SorbetClientHostStatus.Running;

    case SorbetClientSessionStatus.Error:
      return SorbetClientHostStatus.Error;

    case SorbetClientSessionStatus.Stopped:
      return SorbetClientHostStatus.Disabled;
  }
}
