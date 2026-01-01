import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import * as vslcn from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { WorkspaceFolderOutputChannel } from '../common/workspaceFolderOutputChannel';
import { ExtensionContext } from '../extensionContext';
import { getWorkspaceDocumentSelector } from './documentSelectors';
import { HierarchyReferencesRequest } from './hierarchyReferences';
import { SorbetInitializeResult } from './initializeResult';
import { ReadFileRequest } from './readFileRequest';
import { ShowOperationNotification } from './showOperationNotification';
import { ShowSymbolRequest } from './showSymbolRequest';
import { WorkspaceDidChangeConfigurationNotification } from './workspaceDidChangeConfigurationNotification';

/**
 * Create a {@link LanguageClient client} for Sorbet.
 */
export function createClient(
  { log, logOutputChannel }: ExtensionContext,
  workspaceFolder: vscode.WorkspaceFolder,
  clientOptions: Omit<
    vslc.LanguageClientOptions,
    'workspaceFolder' | 'documentSelector' | 'outputChannel'
  >,
  serverOptions: vslcn.ServerOptions,
): vslcn.LanguageClient {
  const mergedClientOptions: vslc.LanguageClientOptions = {
    documentSelector: getWorkspaceDocumentSelector(workspaceFolder),
    initializationFailedHandler: (error) => {
      log.error(
        WorkspaceFolderOutputChannel.normalizedLogValue(
          'Failed to initialize Sorbet.',
          workspaceFolder.name,
        ),
        error,
      );
      return false;
    },
    outputChannel: new WorkspaceFolderOutputChannel(logOutputChannel, workspaceFolder),
    progressOnInitialization: true,
    revealOutputChannelOn: vslc.RevealOutputChannelOn.Never,
    workspaceFolder,
    ...clientOptions,
  };

  return new SorbetLanguageClient(serverOptions, mergedClientOptions, log);
}

class SorbetLanguageClient
  extends vslcn.LanguageClient
  implements
    HierarchyReferencesRequest,
    ReadFileRequest,
    ShowOperationNotification,
    ShowSymbolRequest,
    WorkspaceDidChangeConfigurationNotification
{
  private readonly log: Log;

  constructor(
    serverOptions: vslcn.ServerOptions,
    clientOptions: vslc.LanguageClientOptions,
    log: Log,
  ) {
    super('ruby.sorbet', 'Sorbet', serverOptions, clientOptions);
    this.log = log;
  }

  override error(message: string, data?: any, _showNotification?: boolean | 'force'): void {
    // Primary goal is to override `force` to prevent notifications dialogs
    // from showing up in unintended scenarios (as of Language Client v9).
    // - Sorbet client: couldn't create connection to server.
    //
    // But this override also allows to clean-up logs as the language client
    // tries to insert Date-info and extra spaces. `data2String` is what
    // BaseClientLanguage uses but does not expose.
    if (data) {
      this.log.error(message, data2String(data).trim());
    } else {
      this.log.error(message);
    }

    function data2String(data: any) {
      if (data instanceof vslc.ResponseError) {
        const responseError = data;
        return `Message: ${responseError.message} - Code: ${responseError.code}\n ${responseError.data ? '\n' + responseError.data.toString() : ''}`;
      }
      if (data instanceof Error) {
        if (typeof data.stack === 'string') {
          return data.stack;
        }
        return data.message;
      }
      if (typeof data === 'string') {
        return data;
      }
      return data.toString();
    }
  }

  override get initializeResult(): SorbetInitializeResult | undefined {
    return super.initializeResult as SorbetInitializeResult | undefined;
  }
}
