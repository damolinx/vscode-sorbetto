import * as vscode from 'vscode';
import { TextDocumentItem } from 'vscode-languageclient';
import { REQUEST_METHOD } from '../lsp/readFileRequest';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

/**
 * URI scheme supported by {@link SorbetContentProvider}.
 */
export const SORBET_SCHEME = 'sorbet';

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
    const { activeLanguageClient: client } = this.context.statusProvider;
    if (!client) {
      throw new Error('Sorbet is not running, cannot load file contents');
    }

    const response = await client.sendRequest<TextDocumentItem>(
      REQUEST_METHOD,
      { uri: uri.toString() },
      token,
    );
    const content = response?.text ?? '';
    this.context.log.debug('ContentProvider: Retrieve', uri.path, content.length);

    return content;
  }
}
