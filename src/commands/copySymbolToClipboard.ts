import * as vscode from 'vscode';
import { TextDocumentPositionParams } from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { LspStatus } from '../types';

/**
 * Copy symbol at current.
 * @param context Sorbet extension context.
 */
export async function copySymbolToClipboard(
  context: SorbetExtensionContext,
  editor: vscode.TextEditor,
): Promise<void> {
  const client = context.clientManager.getClient(editor.document.uri);

  if (client?.status !== LspStatus.Running) {
    context.log.warn(
      'CopySymbol: No active Sorbet client.',
      vscode.workspace.asRelativePath(editor.document.uri),
    );
    return;
  }

  // if (!client.lspClient.initializeResult?.capabilities.sorbetShowSymbolProvider) {
  //   context.log.warn("CopySymbol: Sorbet LSP does not support 'showSymbol' capability.");
  //   return;
  // }

  const params: TextDocumentPositionParams = {
    position: editor.selection.start,
    textDocument: {
      uri: editor.document.uri.toString(),
    },
  };

  // If Sorbet is busy, retrieving symbol information might take a while.
  // To avoid having a long operation unexpectedly write to the clipboard,
  // a cancelable progress notification is shown after 2s.
  const symbolInfo = await withProgress(
    (token) => client.sendShowSymbolRequest(params, token),
    2000,
    context.log,
  );

  if (symbolInfo) {
    context.log.info('CopySymbol: Copied symbol to clipboard:', symbolInfo.name);
    await vscode.env.clipboard.writeText(symbolInfo.name);
  } else {
    context.log.info('CopySymbol: No symbol found.');
    await vscode.window.showWarningMessage('No symbol found at the selected location.');
  }
}

async function withProgress<T>(
  task: (token: vscode.CancellationToken) => Promise<T>,
  showProgressAfterMs: number,
  log: Log,
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
