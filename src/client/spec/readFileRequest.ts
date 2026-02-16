import * as vslc from 'vscode-languageclient';

export const READ_FILE_REQUEST = new vslc.RequestType<
  vslc.TextDocumentIdentifier,
  vslc.TextDocumentItem,
  void
>('sorbet/readFile');

/**
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request
 */
export interface ReadFileRequest {
  sendRequest(
    requestType: typeof READ_FILE_REQUEST,
    params: vslc.TextDocumentIdentifier,
    token?: vslc.CancellationToken,
  ): Promise<vslc.TextDocumentItem>;
}
