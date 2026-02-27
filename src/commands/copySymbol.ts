import * as vscode from 'vscode';
import { SorbetClientStatus } from '../clientHost/sorbetClientStatus';
import { ExtensionContext } from '../extensionContext';
import { getClientHost } from './utils';

/**
 * Copies the fully qualified name of the symbol at the current editor location.
 * @param context Extension context.
 */
export async function copySymbol(
  context: ExtensionContext,
  { document, selection }: vscode.TextEditor,
): Promise<void> {
  const clientHost = await getClientHost(context, document.uri);
  if (!clientHost) {
    context.log.warn(
      'CopySymbol: No Sorbet client available.',
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  if (clientHost.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'CopySymbol: Sorbet client is not ready. Status:',
      clientHost.status,
      clientHost.workspaceFolder.uri.toString(true),
    );
    return;
  }

  // If Sorbet is busy, retrieving symbol information may take some time.
  // To prevent a long operation from unexpectedly writing to the clipboard,
  // a cancelable progress notification is shown after 2s.
  const symbolInfo = await withProgress(
    (token) => clientHost.languageClient!.sendShowSymbolRequest(document, selection.start, token),
    2000,
    context,
  );

  if (symbolInfo) {
    context.log.info(`CopySymbol: Copied symbol '${symbolInfo.name}'`);
    await vscode.env.clipboard.writeText(symbolInfo.name);
  } else {
    context.log.info('CopySymbol: No symbol found.');
    await vscode.window.showWarningMessage('No symbol found at the selected location.');
  }
}

async function withProgress<T>(
  task: (token: vscode.CancellationToken) => Promise<T>,
  showProgressAfterMs: number,
  { log }: ExtensionContext,
): Promise<T | undefined> {
  let resolved = false;
  const cts = new vscode.CancellationTokenSource();
  const resultPromise = task(cts.token).then((r) => {
    log.trace('CopySymbol: Operation completed:', r);
    resolved = true;
    return cts.token.isCancellationRequested ? undefined : r;
  });

  await Promise.race([
    new Promise<void>((resolve) => setTimeout(resolve, showProgressAfterMs)).then(() => {
      if (!resolved) {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Querying Sorbet …',
            cancellable: true,
          },
          (_, token) => {
            token.onCancellationRequested(() => {
              log.trace('CopySymbol: Operation canceled.');
              cts.cancel();
            });
            return resultPromise;
          },
        );
      }
    }),
    resultPromise,
  ]);

  return resultPromise;
}
