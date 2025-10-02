import * as vscode from 'vscode';
import { SORBET_SCHEME } from '../lsp/documentSelectors';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

/**
 * Register a content provider for the {@link SORBET_SCHEME sorbet:} scheme.
 */
export function registerSorbetContentProvider(context: SorbetExtensionContext): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(
    SORBET_SCHEME,
    new SorbetContentProvider(context),
  );
}

/**
 * Content provider for URIs with {@link SORBET_SCHEME sorbet:} scheme.
 */
export class SorbetContentProvider implements vscode.TextDocumentContentProvider {
  private readonly context: SorbetExtensionContext;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
  }

  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token?: vscode.CancellationToken,
  ): Promise<string> {
    const client = this.context.clientManager.getClient(uri);
    if (!client) {
      throw new Error('Sorbet is not running, cannot load file contents');
    }

    const response = await client.sendReadFileRequest({ uri: uri.toString() }, token);
    const content = response?.text ?? '';
    this.context.log.debug('ContentProvider: Retrieve', uri.path, 'Size:', content.length);

    return content;
  }
}
