import {
  CancellationToken, SymbolInformation, TextDocumentPositionParams,
} from 'vscode-languageclient';

/**
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request
 */
export interface ShowSymbolRequest {
  sendRequest(
    method: 'sorbet/showSymbol',
    param: TextDocumentPositionParams,
    token?: CancellationToken):
    Promise<SymbolInformation>
}