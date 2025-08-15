import { InitializeResult, ServerCapabilities } from 'vscode-languageclient/node';

export type SorbetInitializeResult = InitializeResult<any> & {
  capabilities: SorbetServerCapabilities;
};

export type SorbetServerCapabilities = ServerCapabilities & {
  sorbetShowSymbolProvider: boolean;
};
