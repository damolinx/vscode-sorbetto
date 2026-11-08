import * as vslc from 'vscode-languageclient/node';

export class LanguageClientErrorHandler implements vslc.ErrorHandler {
  closed() {
    return {
      // TODO: evaluate if we want to restart the server on crash
      action: vslc.CloseAction.DoNotRestart,
      handled: true,
    };
  }

  error() {
    return {
      action: vslc.ErrorAction.Shutdown,
      handled: true,
    };
  }
}
