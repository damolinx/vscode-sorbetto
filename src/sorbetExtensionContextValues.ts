import * as vscode from 'vscode';
import { mapStatus, SorbetStatus } from './api/status';
import { onMainAreaActiveTextEditorChanged, mainAreaActiveEditorUri } from './common/utils';
import { ExtensionContext } from './extensionContext';

export function registerContextValueHandlers(context: ExtensionContext): void {
  registerSorbetStatus(context);
  registerSorbettoActive(context);
}

function registerSorbetStatus({ clientManager, disposables }: ExtensionContext): void {
  const contextKey = 'sorbetto:sorbetStatus';
  setContext<SorbetStatus | undefined>(contextKey, undefined);

  disposables.push(
    clientManager.onStatusChanged(({ client }) => {
      const editor = mainAreaActiveEditorUri();
      if (editor && client.inScope(editor)) {
        setContext<SorbetStatus | undefined>(contextKey, mapStatus(client.status));
      }
    }),
    onMainAreaActiveTextEditorChanged((editor) => {
      const client = editor && clientManager.getClient(editor.document.uri);
      if (client) {
        setContext<SorbetStatus | undefined>(contextKey, mapStatus(client.status));
      }
    }),
  );
}

function registerSorbettoActive({ clientManager, disposables }: ExtensionContext): void {
  const contextKey = 'sorbetto:active';
  setContext<boolean>(contextKey, Boolean(clientManager.clientCount));

  disposables.push(
    clientManager.onClientAdded(() => setContext<boolean>(contextKey, true)),
    clientManager.onClientRemoved(
      () => !clientManager.clientCount && setContext<boolean>(contextKey, false),
    ),
  );
}

function setContext<T>(contextKey: string, arg: T) {
  vscode.commands.executeCommand('setContext', contextKey, arg);
}
