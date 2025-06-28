import { CancellationToken, TextDocumentIdentifier, TextDocumentItem } from 'vscode-languageclient';

export const REQUEST_METHOD = 'sorbet/readFile';

/**
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request
 */
export interface ReadFileRequest {
  sendRequest(
    method: typeof REQUEST_METHOD,
    param: TextDocumentIdentifier,
    token?: CancellationToken):
    Promise<TextDocumentItem>
}