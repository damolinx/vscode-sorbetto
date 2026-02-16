import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import * as vslcn from 'vscode-languageclient/node';
import {
  HIERARCHY_REFERENCES_REQUEST,
  HierarchyReferencesRequest,
} from './spec/hierarchyReferencesRequest';
import { SorbetInitializeResult } from './spec/initializeResult';
import { READ_FILE_REQUEST, ReadFileRequest } from './spec/readFileRequest';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  SorbetShowOperationParams,
} from './spec/showOperationNotification';
import { SHOW_SYMBOL_REQUEST, ShowSymbolRequest } from './spec/showSymbolRequest';
import {
  Configuration,
  DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD,
  WorkspaceDidChangeConfigurationNotification,
} from './spec/workspaceDidChangeConfigurationNotification';

export type SorbetLanguageClientOptions = vslc.LanguageClientOptions & {
  outputChannel: vscode.LogOutputChannel;
  workspaceFolder: vscode.WorkspaceFolder;
};

export class SorbetClient extends vslcn.LanguageClient {
  public readonly operations: SorbetShowOperationParams[];
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  constructor(serverOptions: vslcn.ServerOptions, clientOptions: SorbetLanguageClientOptions) {
    super('sorbetto', 'Sorbet', serverOptions, clientOptions);
    this.operations = [];
    this.workspaceFolder = clientOptions.workspaceFolder;
  }

  private errorData2String(data: any) {
    if (data instanceof vslc.ResponseError) {
      const trimmed = data.message.trimEnd();
      const normalizedMessage = trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
      const normalizedData = data.data ? `\n${data.data}` : '';
      return `${normalizedMessage} Code: ${data.code}${normalizedData}`;
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

  public override error(message: string, data?: any, _showNotification?: boolean | 'force'): void {
    // Primary goal is to override `force` to prevent notifications dialogs
    // from showing up in unintended scenarios (as of Language Client v9).
    // - Sorbet client: couldn't create connection to server.
    //
    // But this override also allows to clean-up logs as the language client
    // tries to insert Date-info and extra spaces. `data2String` is what
    // BaseClientLanguage privately uses, therefore use `errorData2String`.
    if (data) {
      this.outputChannel.error(message, this.errorData2String(data).trim());
    } else {
      this.outputChannel.error(message);
    }
  }

  public override get initializeResult(): SorbetInitializeResult | undefined {
    return super.initializeResult as SorbetInitializeResult | undefined;
  }

  public override get outputChannel(): vscode.LogOutputChannel {
    // TODO: Remove after updating to LanguageClient 10.
    return super.outputChannel as vscode.LogOutputChannel;
  }

  public override async start(): Promise<void> {
    await super.start();
    this.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, (params: SorbetShowOperationParams) => {
      if (params.status === 'end') {
        const index = this.operations.findIndex(
          ({ operationName }) => operationName === params.operationName,
        );
        if (index !== -1) {
          this.operations.splice(index, 1);
        }
      } else {
        this.operations.push(params);
      }
    });
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public sendDidChangeConfigurationNotification(settings: Configuration): Promise<void> {
    return (this as WorkspaceDidChangeConfigurationNotification).sendNotification(
      DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD,
      {
        settings,
      },
    );
  }

  /**
   * Send a `sorbet/hierarchyReferences` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbethierarchyreferences-request
   */
  public async sendHierarchyReferencesRequest(
    { uri }: vscode.TextDocument,
    position: vslcn.Position,
    context: vscode.ReferenceContext = { includeDeclaration: true },
    token?: vscode.CancellationToken,
  ): Promise<vslcn.Location[] | undefined> {
    const params: vslcn.ReferenceParams = {
      context,
      position,
      textDocument: {
        uri: uri.toString(),
      },
    };
    const locations = await (this as HierarchyReferencesRequest).sendRequest(
      HIERARCHY_REFERENCES_REQUEST,
      params,
      token,
    );
    return locations ?? undefined;
  }

  /**
   * Send a `sorbet/readFile` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
   */
  public async sendReadFileRequest(
    uri: vscode.Uri,
    token?: vscode.CancellationToken,
  ): Promise<vslcn.TextDocumentItem | undefined> {
    const params: vslcn.TextDocumentIdentifier = { uri: uri.toString() };
    const content = await (this as ReadFileRequest).sendRequest(READ_FILE_REQUEST, params, token);
    return content ?? undefined;
  }

  /**
   * Send a `sorbet/showSymbol` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request.
   */
  public async sendShowSymbolRequest(
    { uri }: vscode.TextDocument,
    position: vslcn.Position,
    token?: vscode.CancellationToken,
  ): Promise<vslcn.SymbolInformation | undefined> {
    const params: vslcn.TextDocumentPositionParams = {
      position,
      textDocument: {
        uri: uri.toString(),
      },
    };

    const symbolInfo = await (this as ShowSymbolRequest).sendRequest(
      SHOW_SYMBOL_REQUEST,
      params,
      token,
    );
    return symbolInfo ?? undefined;
  }
}
