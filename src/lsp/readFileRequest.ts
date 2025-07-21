import { CancellationToken, TextDocumentIdentifier, TextDocumentItem } from 'vscode-languageclient';

export const READ_FILE_REQUEST_METHOD = 'sorbet/readFile';

/**
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request
 */
export interface ReadFileRequest {
  sendRequest(
    method: typeof READ_FILE_REQUEST_METHOD,
    param: TextDocumentIdentifier,
    token?: CancellationToken
  ): Promise<TextDocumentItem>
}