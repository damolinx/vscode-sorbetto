import * as vslc from 'vscode-languageclient';

export const SHOW_SYMBOL_REQUEST = new vslc.RequestType<
  vslc.TextDocumentPositionParams,
  vslc.SymbolInformation,
  void
>('sorbet/showSymbol');

/**
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request
 */
export interface ShowSymbolRequest {
  sendRequest(
    requestType: typeof SHOW_SYMBOL_REQUEST,
    params: vslc.TextDocumentPositionParams,
    token?: vslc.CancellationToken,
  ): Promise<vslc.SymbolInformation | null>;
}
