import * as vslc from 'vscode-languageclient';

export const SHOW_SYMBOL_REQUEST_METHOD = 'sorbet/showSymbol';

/**
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request
 */
export interface ShowSymbolRequest {
  sendRequest(
    method: typeof SHOW_SYMBOL_REQUEST_METHOD,
    param: vslc.TextDocumentPositionParams,
    token?: vslc.CancellationToken,
  ): Promise<vslc.SymbolInformation>;
}
