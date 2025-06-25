import { CancellationToken, TextDocumentIdentifier, TextDocumentItem } from 'vscode-languageclient';

/**
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request
 */
export interface ReadFileRequest {
  sendRequest(
    method: 'sorbet/readFile',
    param: TextDocumentIdentifier,
    token?: CancellationToken):
    Promise<TextDocumentItem>
}