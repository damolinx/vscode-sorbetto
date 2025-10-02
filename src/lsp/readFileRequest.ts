import * as vslc from 'vscode-languageclient';

export const READ_FILE_REQUEST_METHOD = 'sorbet/readFile';

/**
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request
 */
export interface ReadFileRequest {
  sendRequest(
    method: typeof READ_FILE_REQUEST_METHOD,
    param: vslc.TextDocumentIdentifier,
    token?: vslc.CancellationToken,
  ): Promise<vslc.TextDocumentItem>;
}
