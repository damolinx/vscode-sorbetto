import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import * as vslcn from 'vscode-languageclient/node';
import { posix } from 'path';
import { CodeActionMiddleware } from './middlewares/codeActionMiddleware';
import { Middleware } from './middlewares/middleware';
import { SorbetLanguageClientOptions, SorbetClient } from './sorbetClient';

const SorbetClientMiddleware = {
  ...CodeActionMiddleware,
  ...Middleware,
} as const;

export function createClient(
  clientOptions: SorbetLanguageClientOptions & { middleware?: never },
  serverOptions: vslcn.ServerOptions,
): SorbetClient {
  const { outputChannel, workspaceFolder } = clientOptions;
  const mergedClientOptions: SorbetLanguageClientOptions = {
    documentSelector: getWorkspaceDocumentSelector(workspaceFolder),
    initializationFailedHandler: (error) => {
      outputChannel.error('Failed to initialize Sorbet.', error);
      return false;
    },
    progressOnInitialization: true,
    middleware: SorbetClientMiddleware,
    revealOutputChannelOn: vslc.RevealOutputChannelOn.Never,
    ...clientOptions,
  };

  return new SorbetClient(serverOptions, mergedClientOptions);
}

function getWorkspaceDocumentSelector({ uri }: vscode.WorkspaceFolder): vslc.DocumentSelector {
  const selector: vslc.DocumentSelector = [
    // `sorbet` URIs do not have a hint to discriminate paths per workspace
    { scheme: 'sorbet' },
  ];

  if (uri.scheme === 'file') {
    const pattern = posix.join(uri.path, '**/*');
    selector.push({
      language: 'ruby',
      scheme: 'file',
      pattern,
    });
  }

  return selector;
}
