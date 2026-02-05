import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import * as vslcn from 'vscode-languageclient/node';
import { DecoratedOutputChannel } from '../common/decoratedOutputChannel';
import { Log } from '../common/log';
import { ExtensionContext } from '../extensionContext';
import { getWorkspaceDocumentSelector } from './documentSelectors';
import { HierarchyReferencesRequest } from './hierarchyReferences';
import { SorbetInitializeResult } from './initializeResult';
import { ReadFileRequest } from './readFileRequest';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  ShowOperationNotification,
  SorbetShowOperationParams,
} from './showOperationNotification';
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
): SorbetLanguageClient {
  const mergedClientOptions: vslc.LanguageClientOptions = {
    documentSelector: getWorkspaceDocumentSelector(workspaceFolder),
    initializationFailedHandler: (error) => {
      log.error(
        DecoratedOutputChannel.normalizedLogValue(
          'Failed to initialize Sorbet.',
          workspaceFolder.name,
        ),
        error,
      );
      return false;
    },
    outputChannel: new DecoratedOutputChannel(logOutputChannel, workspaceFolder.name),
    progressOnInitialization: true,
    revealOutputChannelOn: vslc.RevealOutputChannelOn.Never,
    workspaceFolder,
    ...clientOptions,
  };

  return new SorbetLanguageClient(serverOptions, mergedClientOptions, log);
}

export class SorbetLanguageClient
  extends vslcn.LanguageClient
  implements
    HierarchyReferencesRequest,
    ReadFileRequest,
    ShowOperationNotification,
    ShowSymbolRequest,
    WorkspaceDidChangeConfigurationNotification
{
  private readonly log: Log;
  public operations: SorbetShowOperationParams[];

  constructor(
    serverOptions: vslcn.ServerOptions,
    clientOptions: vslc.LanguageClientOptions,
    log: Log,
  ) {
    super('sorbetto', 'Sorbet', serverOptions, clientOptions);
    this.log = log;
    this.operations = [];
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
        return `${responseError.message}${responseError.message.endsWith('.') ? ' ' : '. '}Code: ${responseError.code}${responseError.data ? `\n${responseError.data}` : ''}`;
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

  override async start(): Promise<void> {
    await super.start();
    this.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, (params: SorbetShowOperationParams) => {
      if (params.status === 'end') {
        const filteredOps = this.operations.filter(
          ({ operationName }) => operationName !== params.operationName,
        );
        if (filteredOps.length !== this.operations.length) {
          this.operations = filteredOps;
        }
      } else {
        this.operations.push(params);
      }
    });
  }
}
