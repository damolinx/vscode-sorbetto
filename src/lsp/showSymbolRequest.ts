import {
  CancellationToken, SymbolInformation, TextDocumentPositionParams,
} from 'vscode-languageclient';

export const SHOW_SYMBOL_REQUEST_METHOD = 'sorbet/showSymbol';

/**
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request
 */
export interface ShowSymbolRequest {
  sendRequest(
    method: typeof SHOW_SYMBOL_REQUEST_METHOD,
    param: TextDocumentPositionParams,
    token?: CancellationToken):
    Promise<SymbolInformation>
}