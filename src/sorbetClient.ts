import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient/node';
import { ChildProcess } from 'child_process';
import { instrumentLanguageClient } from './common/metrics';
import { LspConfiguration } from './configuration/lspConfiguration';
import { InitializationOptions } from './lsp/initializationOptions';
import { createClient, SorbetLanguageClient } from './lsp/languageClient';
import { READ_FILE_REQUEST_METHOD } from './lsp/readFileRequest';
import { SHOW_OPERATION_NOTIFICATION_METHOD, SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SHOW_SYMBOL_REQUEST_METHOD } from './lsp/showSymbolRequest';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD } from './lsp/workspaceDidChangeConfigurationNotification';
import { ProcessWithExitPromise, spawnWithExitPromise } from './common/processUtils';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus } from './types';

/**
 * Sorbet LSP server timeout before forcefully killing the process.
 */
export const SORBET_CLIENT_DISPOSE_TIMEOUT_MS = 5000;

export class SorbetClient implements vscode.Disposable, vslc.ErrorHandler {
  private _status: ServerStatus;
  private readonly configuration: LspConfiguration;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  public readonly lspClient: SorbetLanguageClient;
  public lspProcess?: ProcessWithExitPromise;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<ServerStatus>;
  private readonly workspaceFolder: vscode.WorkspaceFolder;

  constructor(
    context: SorbetExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
    configuration: LspConfiguration,
  ) {
    this._status = ServerStatus.INITIALIZING;
    this.configuration = configuration;
    this.context = context;
    this.lspClient = instrumentLanguageClient(
      createClient(
        context,
        workspaceFolder,
        () => this.startClient(),
        this),
      this.context.metrics,
    );
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.workspaceFolder = workspaceFolder;

    this.disposables = [
      this.onStatusChangedEmitter,
      { dispose: () => this.lspClient.dispose(SORBET_CLIENT_DISPOSE_TIMEOUT_MS) },
    ];
  }

  dispose() {
    vscode.Disposable.from(...this.disposables);
  }

  closed(): vslc.CloseHandlerResult {
    return {
      action: vslc.CloseAction.DoNotRestart,
      handled: true,
    };
  }

  error(): vslc.ErrorHandlerResult {
    return {
      action: vslc.ErrorAction.Shutdown,
      handled: true,
    };
  }

  /**
   * Evaluates if {@link uri} is in scope of {@link workspaceFolder}. If {@link uri}
   * is missing, it defaults to `vscode.window.activeTextEditor`'s.
   */
  public inScope(uri?: vscode.Uri): boolean {
    const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    return !!targetUri
      && vscode.workspace.getWorkspaceFolder(targetUri)?.name === this.workspaceFolder.name;
  }

  /**
   * Register a handler for 'workspace/didChangeConfiguration' notifications.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
   */
  public onDidChangeConfigurationNotification(handler: vslc.NotificationHandler<InitializationOptions>)
    : vscode.Disposable {
    return this.lspClient.onNotification(DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, handler);
  }

  /**
  * Register a handler for 'sorbet/showOperation' notifications.
  * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
  */
  public onShowOperationNotification(handler: vslc.NotificationHandler<SorbetShowOperationParams>)
    : vscode.Disposable {
    return this.lspClient.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, handler);
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChanged(): vscode.Event<ServerStatus> {
    return this.onStatusChangedEmitter.event;
  }

  /**
   * Send a `sorbet/readFile` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
   */
  public async sendReadFileRequest(param: vslc.TextDocumentIdentifier, token?: vscode.CancellationToken)
    : Promise<vslc.TextDocumentItem | undefined> {
    const content = await this.lspClient.sendRequest<vslc.TextDocumentItem>(
      READ_FILE_REQUEST_METHOD, param, token);
    return content ?? undefined;
  }

  /**
   * Send a `sorbet/showSymbol` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request.
   */
  public async sendShowSymbolRequest(param: vslc.TextDocumentPositionParams, token?: vscode.CancellationToken)
    : Promise<vslc.SymbolInformation | undefined> {
    const symbolInfo = await this.lspClient.sendRequest<vslc.SymbolInformation>(
      SHOW_SYMBOL_REQUEST_METHOD, param, token);
    return symbolInfo ?? undefined;
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public sendDidChangeConfigurationNotification(param: InitializationOptions)
    : Promise<void> {
    return this.lspClient.sendNotification(
      DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, { settings: param });
  }

  /**
   * Send a `sorbet/showOperation` notification to the language server.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification.
   */
  public sendShowOperationNotification(param: any)
    : Promise<void> {
    return this.lspClient.sendNotification(
      SHOW_OPERATION_NOTIFICATION_METHOD, param);
  }

  public get status(): ServerStatus {
    return this._status;
  }

  public set status(value: ServerStatus) {
    if (this._status === value) {
      return;
    }

    this._status = value;
    this.onStatusChangedEmitter.fire(value);
  }

  public async start(): Promise<ProcessWithExitPromise> {
    if (this.lspClient.needsStart()) {
      this.status = ServerStatus.INITIALIZING;
      await this.lspClient.start();

      // In case of error (missing Sorbet process), the client might have already
      // transitioned to Error or Restarting so this should not override that.
      if (this.status === ServerStatus.INITIALIZING) {
        this.status = ServerStatus.RUNNING;
      }
    }

    return this.lspProcess!;
  }

  private async startClient(): Promise<ChildProcess> {
    this.context.log.info('Start Sorbet LSP', this.workspaceFolder.uri.toString());
    this.context.log.info('>', this.configuration.cmd, ...this.configuration.args);

    this.lspProcess = spawnWithExitPromise(
      this.configuration.cmd,
      this.configuration.args,
      {
        cwd: this.workspaceFolder.uri.fsPath,
        env: { ...process.env, ...this.configuration.env },
      });

    const { process: lspProcess } = this.lspProcess;
    if (lspProcess.pid !== undefined) {
      this.context.log.info('> pid', lspProcess.pid);
    }

    this.lspProcess.exit = this.lspProcess.exit.then(
      (errorInfo) => {
        if (errorInfo) {
          this.context.log.debug('Sorbet LSP process failed.', errorInfo?.pid ?? '«no pid»', errorInfo);
          this.status = ServerStatus.ERROR;
        } else {
          this.context.log.debug('Sorbet LSP process exited.', lspProcess.pid ?? '«no pid»', lspProcess.exitCode);
          this.status = ServerStatus.DISABLED;
        }
        return errorInfo;
      });

    return this.lspProcess.process;
  }
}