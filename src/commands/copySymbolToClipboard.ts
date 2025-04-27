import { CancellationToken, CancellationTokenSource, env, ProgressLocation, TextEditor, window } from 'vscode';
import {
  SymbolInformation,
  TextDocumentPositionParams,
} from 'vscode-languageclient/node';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ServerStatus } from '../types';
import { Log } from '../log';

/**
 * Copy symbol at current.
 * @param context Sorbet extension context.
 */
export async function copySymbolToClipboard(
  context: SorbetExtensionContext,
  editor: TextEditor,
): Promise<void> {
  if (!editor.selection.isEmpty) {
    context.log.warn('CopySymbol: Non-empty selection, cannot determine target symbol.');
    return;
  }

  const { activeLanguageClient: client } = context.statusProvider;
  if (client?.status !== ServerStatus.RUNNING) {
    context.log.warn('CopySymbol: No active Sorbet client.');
    return;
  }

  if (!client.capabilities?.sorbetShowSymbolProvider) {
    context.log.warn(
      'CopySymbol: Sorbet LSP does not support \'showSymbol\' capability.',
    );
    return;
  }

  const { active: position } = editor.selection;
  const params: TextDocumentPositionParams = {
    textDocument: {
      uri: editor.document.uri.toString(),
    },
    position,
  };

  // If Sorbet is busy, retrieving symbol information might take a while. To
  // avoid having long operation surprisingly overwrite the current clipboard
  // contents, a cancelable progress notification is shown after 2s.
  const symbolInfo = await withProgress(
    (token) => client.sendRequest<SymbolInformation>('sorbet/showSymbol', params, token),
    2000,
    context.log);

  if (symbolInfo) {
    await env.clipboard.writeText(symbolInfo.name);
    context.log.info('CopySymbol: Copied symbol to clipboard:', symbolInfo.name);
  } else {
    context.log.info('CopySymbol: No symbol found.');
  }
}

async function withProgress<T>(task: (token: CancellationToken) => Promise<T>, progressDelayMS: number, log: Log): Promise<T | undefined> {
  let resolved = false;
  const cts = new CancellationTokenSource();
  const resultPromise = task(cts.token)
    .then((r) => {
      log.trace('CopySymbol: Operation completed:', r);
      resolved = true;
      return cts.token.isCancellationRequested ? undefined : r;
    });

  await Promise.race([
    new Promise<void>(resolve => setTimeout(resolve, progressDelayMS))
      .then(() => {
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