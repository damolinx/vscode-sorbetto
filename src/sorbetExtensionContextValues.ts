import * as vscode from 'vscode';
import { mapStatus, SorbetStatus } from './api/status';
import { onMainAreaActiveTextEditorChanged, mainAreaActiveTextEditorUri } from './common/utils';
import { SorbetExtensionContext } from './sorbetExtensionContext';

export function registerContextValueHandlers(context: SorbetExtensionContext): vscode.Disposable[] {
  return [...registerSorbettoActive(context), ...registerSorbetClientStatus(context)].flat();
}

function registerSorbetClientStatus({
  clientManager,
  statusProvider,
}: SorbetExtensionContext): vscode.Disposable[] {
  const contextKey = 'sorbetto:sorbetStatus';
  setContext<SorbetStatus | undefined>(contextKey, undefined);
  return [
    onMainAreaActiveTextEditorChanged((editor) => {
      const status = editor && clientManager.getClient(editor.document.uri)?.status;
      setContext<SorbetStatus | undefined>(contextKey, status && mapStatus(status));
    }),
    statusProvider.onStatusChanged(({ client }) => {
      const currentEditor = mainAreaActiveTextEditorUri();
      if (currentEditor && client.inScope(currentEditor)) {
        setContext<SorbetStatus | undefined>(contextKey, mapStatus(client.status));
      }
    }),
  ];
}

function registerSorbettoActive({ clientManager }: SorbetExtensionContext): vscode.Disposable[] {
  const contextKey = 'sorbetto:active';
  setContext<boolean>(contextKey, Boolean(clientManager.clientCount));
  return [
    clientManager.onClientAdded(() => setContext(contextKey, true)),
    clientManager.onClientRemoved(
      () => !clientManager.clientCount && setContext(contextKey, false),
    ),
  ];
}

function setContext<T>(contextKey: string, arg: T) {
  vscode.commands.executeCommand('setContext', contextKey, arg);
}
