import * as vslcn from 'vscode-languageclient/node';

export type SorbetInitializeResult = vslcn.InitializeResult & {
  capabilities: SorbetServerCapabilities;
};

export type SorbetServerCapabilities = vslcn.ServerCapabilities & {
  sorbetShowSymbolProvider: boolean;
};
