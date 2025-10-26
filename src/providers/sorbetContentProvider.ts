import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { SORBET_SCHEME } from '../lsp/documentSelectors';

/**
 * Register a content provider for the {@link SORBET_SCHEME sorbet:} scheme.
 */
export function registerSorbetContentProvider(context: ExtensionContext): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(
    SORBET_SCHEME,
    new SorbetContentProvider(context),
  );
}

/**
 * Content provider for URIs with {@link SORBET_SCHEME sorbet:} scheme.
 */
export class SorbetContentProvider implements vscode.TextDocumentContentProvider {
  private readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token?: vscode.CancellationToken,
  ): Promise<string> {
    let content = '';

    // TODO: This isn't entirely correct, but at least one Sorbet instance might be able
    // to resolve the URI - an edge case is that resolution may depend on the workspace.
    const clients = this.context.clientManager.getClients();
    if (clients.length === 0) {
      this.context.log.warn(
        'ContentProvider: No Sorbet Client available to resolve URI',
        uri.toString(true),
      );
      return content;
    }

    for (const client of clients) {
      const response = await client.sendReadFileRequest(uri, token);
      if (response) {
        content = response.text;
        this.context.log.debug(
          'ContentProvider: Resolved',
          uri.toString(true),
          'with Sorbet client for',
          client.workspaceFolder.name,
          'workspace',
        );
        break;
      }
    }

    this.context.log.debug(
      'ContentProvider: Retrieved',
      uri.path,
      'Content-length',
      content.length,
    );
    return content;
  }
}
