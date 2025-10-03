import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
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
    // TODO: This isn't entirely correct, but at least one Sorbet instance should be able
    // to resolve this URI - an edge case is that resolution may depend on the workspace.
    const clients = this.context.clientManager.getClients();

    let response: vslc.TextDocumentItem | undefined;
    if (clients.length === 0) {
      this.context.log.warn(
        'ContentProvider: No Sorbet Client available to resolve URI',
        uri.toString(true),
      );
    } else {
      const requestParams: vslc.TextDocumentIdentifier = { uri: uri.toString() };
      for (const client of this.context.clientManager.getClients()) {
        response = await client.sendReadFileRequest(requestParams, token);
        if (response) {
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
    }

    const content = response?.text ?? '';
    this.context.log.debug('ContentProvider: Retrieve', uri.path, 'Size:', content.length);
    return content;
  }
}
