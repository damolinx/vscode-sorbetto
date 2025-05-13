import * as vscode from 'vscode';
import { TextDocumentItem } from 'vscode-languageclient';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

/**
 * URI scheme supported by {@link SorbetContentProvider}.
 */
export const SORBET_SCHEME = 'sorbet';

export function registerSorbetContentProvider(context: SorbetExtensionContext): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(
    SORBET_SCHEME,
    new SorbetContentProvider(context),
  );
}

/**
 * Content provider for URIs with `sorbet` scheme.
 */
export class SorbetContentProvider implements vscode.TextDocumentContentProvider {
  private readonly context: SorbetExtensionContext;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
  }

  /**
   * Provide textual content for a given uri.
   */
  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token?: vscode.CancellationToken,
  ): Promise<string> {
    let content: string;
    const { activeLanguageClient: client } = this.context.statusProvider;
    if (client) {
      this.context.log.info('ContentProvider: Retrieving file contents', uri);
      const response = await client.sendRequest<TextDocumentItem>(
        'sorbet/readFile',
        { uri: uri.toString() },
        token,
      );
      content = response?.text ?? '';
    } else {
      this.context.log.warn(
        'ContentProvider: No active Sorbet client',
        uri,
      );
      content = '';
    }
    return content;
  }
}
