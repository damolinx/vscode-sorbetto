import * as vslcn from 'vscode-languageclient/node';

export type SorbetInitializeResult = vslcn.InitializeResult<any> & {
  capabilities: SorbetServerCapabilities;
};

export type SorbetServerCapabilities = vslcn.ServerCapabilities & {
  sorbetShowSymbolProvider: boolean;
};
