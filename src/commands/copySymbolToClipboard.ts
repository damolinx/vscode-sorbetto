import { env, ProgressLocation, TextEditor, window } from 'vscode';
import {
  SymbolInformation,
  TextDocumentPositionParams,
} from 'vscode-languageclient/node';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ServerStatus } from '../types';

/**
 * Copy symbol at current.
 * @param context Sorbet extension context.
 */
export async function copySymbolToClipboard(
  context: SorbetExtensionContext,
  editor: TextEditor
): Promise<void> {
  if (!editor.selection.isEmpty) {
    context.log.debug(
      'CopySymbol: Non-empty selection, cannot determine target symbol.',
    );
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

  let canceled = false;
  const symbolInfo = await window.withProgress(
    {
      cancellable: true,
      location: ProgressLocation.Notification,
    },
    async (progress, token) => {
      progress.report({ message: 'Querying Sorbet …' });
      const r = await client.sendRequest<SymbolInformation>(
        'sorbet/showSymbol',
        params,
        token,
      );

      canceled = token.isCancellationRequested;
      return r || undefined;
    },
  );

  if (symbolInfo) {
    await env.clipboard.writeText(symbolInfo.name);
    context.log.debug('CopySymbol: Copied symbol name', symbolInfo.name);
  } else if (!canceled) {
    window.showWarningMessage('No symbol information found current location');
    context.log.debug('CopySymbol: No symbol name');
  } else {
    context.log.debug('CopySymbol: Canceled operation');
  }
}
