import {
  CancellationToken,
  CancellationTokenSource,
  env,
  ProgressLocation,
  TextEditor,
  window,
} from 'vscode';
import { TextDocumentPositionParams } from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ServerStatus } from '../types';

/**
 * Copy symbol at current.
 * @param context Sorbet extension context.
 */
export async function copySymbolToClipboard(
  context: SorbetExtensionContext,
  editor: TextEditor,
): Promise<void> {
  const { sorbetClient } = context.clientManager;
  if (sorbetClient?.status !== ServerStatus.RUNNING) {
    context.log.warn('CopySymbol: No active Sorbet client.');
    return;
  }

  if (!sorbetClient.lspClient.initializeResult?.capabilities.sorbetShowSymbolProvider) {
    context.log.warn("CopySymbol: Sorbet LSP does not support 'showSymbol' capability.");
    return;
  }

  const selectionEmpty = editor.selection.isEmpty;
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
    (token) => sorbetClient.sendShowSymbolRequest(params, token),
    2000,
    context.log,
  );

  if (symbolInfo) {
    context.log.info('CopySymbol: Copied symbol to clipboard:', symbolInfo.name);
    await env.clipboard.writeText(symbolInfo.name);
  } else {
    context.log.info('CopySymbol: No symbol found.');
    await window.showWarningMessage(
      selectionEmpty
        ? 'No symbol found at cursor location.'
        : 'No symbol found at the start of your selection.',
    );
  }
}

async function withProgress<T>(
  task: (token: CancellationToken) => Promise<T>,
  progressDelayMS: number,
  log: Log,
): Promise<T | undefined> {
  let resolved = false;
  const cts = new CancellationTokenSource();
  const resultPromise = task(cts.token).then((r) => {
    log.trace('CopySymbol: Operation completed:', r);
    resolved = true;
    return cts.token.isCancellationRequested ? undefined : r;
  });

  await Promise.race([
    new Promise<void>((resolve) => setTimeout(resolve, progressDelayMS)).then(() => {
      if (!resolved) {
        window.withProgress(
          {
            location: ProgressLocation.Notification,
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
