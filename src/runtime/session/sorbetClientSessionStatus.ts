import * as vslcn from 'vscode-languageclient/node';

export const enum SorbetClientSessionStatus {
  // An error has occurred. The user must dismiss the error.
  Error = 'Error',
  // The language client is initializing.
  Initializing = 'Initializing',
  // The language client is running, and so is Sorbet.
  Running = 'Running',
  // The language client is stopped.
  Stopped = 'Stopped',
}

export function convertToClientSessionStatus(state: vslcn.State): SorbetClientSessionStatus {
  switch (state) {
    case vslcn.State.Running:
      return SorbetClientSessionStatus.Running;
    case vslcn.State.Starting:
      return SorbetClientSessionStatus.Initializing;
    case vslcn.State.StartFailed:
      return SorbetClientSessionStatus.Error;
    case vslcn.State.Stopped:
      return SorbetClientSessionStatus.Stopped;
  }
}
