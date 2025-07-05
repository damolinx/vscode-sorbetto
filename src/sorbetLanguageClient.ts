import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient/node';
import { ChildProcess } from 'child_process';
import { instrumentLanguageClient } from './common/metrics';
import { buildLspConfiguration } from './configuration/lspConfiguration';
import { InitializationOptions } from './lsp/initializationOptions';
import { SorbetServerCapabilities } from './lsp/initializeResult';
import { createClient, SorbetClient } from './lsp/languageClient';
import { READ_FILE_REQUEST_METHOD } from './lsp/readFileRequest';
import { SHOW_OPERATION_NOTIFICATION_METHOD, SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SHOW_SYMBOL_REQUEST_METHOD } from './lsp/showSymbolRequest';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD } from './lsp/workspaceDidChangeConfigurationNotification';
import { E_COMMAND_NOT_FOUND, E_SIGKILL, E_SIGTERM, ErrorInfo, ProcessWithExitPromise, spawnWithExitPromise } from './processUtils';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus, RestartReason } from './types';

export class SorbetLanguageClient implements vscode.Disposable, vslc.ErrorHandler {
  private readonly context: SorbetExtensionContext;
  private readonly languageClient: SorbetClient;
  private readonly onStatusChangeEmitter: vscode.EventEmitter<ServerStatus>;
  public sorbetProcess?: ProcessWithExitPromise;
  public sorbetRestartReason?: RestartReason;

  private wrappedLastError?: ErrorInfo;
  private wrappedStatus: ServerStatus;

  constructor(context: SorbetExtensionContext, workspaceFolder: vscode.WorkspaceFolder) {
    this.context = context;
    this.languageClient = instrumentLanguageClient(
      createClient(
        context,
        workspaceFolder,
        () => this.startSorbetProcess(workspaceFolder),
        this),
      this.context.metrics,
    );

    this.onStatusChangeEmitter = new vscode.EventEmitter();
    this.wrappedStatus = ServerStatus.INITIALIZING;
  }

  dispose(): void {
    this.onStatusChangeEmitter.dispose();
    this.languageClient.stop();
    this.sorbetProcess?.exit.catch((err) => {
      this.context.log.error('Error while stopping Sorbet process', err);
    });
  }

  /**
   * Sorbet language server {@link SorbetServerCapabilities capabilities}. Only
   * available when the server has been initialized.
   */
  public get capabilities(): SorbetServerCapabilities | undefined {
    return this.languageClient.initializeResult?.capabilities;
  }

  /**
   * Last error message when {@link status} is {@link ServerStatus.ERROR}.
   */
  public get lastError(): ErrorInfo | undefined {
    return this.wrappedLastError;
  }

  /**
   * Resolves when client is ready to serve requests.
   */
  public async start(): Promise<ProcessWithExitPromise> {
    if (!this.languageClient.needsStart()) {
      this.context.log.debug('Ignored unnecessary start request');
      return this.sorbetProcess!;
    }

    this.status = ServerStatus.INITIALIZING;
    await this.languageClient.start();

    // In case of error (missing Sorbet process), the client might have already
    // transitioned to Error or Restarting so this should not override that.
    if (this.status === ServerStatus.INITIALIZING) {
      this.status = ServerStatus.RUNNING;
    }

    return this.sorbetProcess!;
  }

  /**
   * Register a handler for 'workspace/didChangeConfiguration' notifications.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
   */
  public onDidChangeConfigurationNotification(handler: vslc.NotificationHandler<InitializationOptions>)
    : vscode.Disposable {
    return this.languageClient.onNotification(DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, handler);
  }

  /**
  * Register a handler for 'sorbet/showOperation' notifications.
  * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
  */
  public onShowOperationNotification(handler: vslc.NotificationHandler<SorbetShowOperationParams>)
    : vscode.Disposable {
    return this.languageClient.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, handler);
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChange(): vscode.Event<ServerStatus> {
    return this.onStatusChangeEmitter.event;
  }

  /**
 * Send a `sorbet/readFile` request to the language server.
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
 */
  public sendReadFileRequest(param: vslc.TextDocumentIdentifier, token?: vscode.CancellationToken)
    : Promise<vslc.TextDocumentItem | undefined> {
    return this.languageClient.sendRequest<vslc.TextDocumentItem>(
      READ_FILE_REQUEST_METHOD, param, token) ?? undefined;
  }

  /**
 * Send a `sorbet/showSymbol` request to the language server.
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request.
 */
  public sendShowSymbolRequest(param: vslc.TextDocumentPositionParams, token?: vscode.CancellationToken)
    : Promise<vslc.SymbolInformation | undefined> {
    return this.languageClient.sendRequest<vslc.SymbolInformation>(
      SHOW_SYMBOL_REQUEST_METHOD, param, token) ?? undefined;
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public sendDidChangeConfigurationNotification(param: InitializationOptions)
    : Promise<void> {
    return this.languageClient.sendNotification(
      DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, { settings: param });
  }

  /**
   * Send a `sorbet/showOperation` notification to the language server.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification.
   */
  public sendShowOperationNotification(param: any)
    : Promise<void> {
    return this.languageClient.sendNotification(
      SHOW_OPERATION_NOTIFICATION_METHOD, param);
  }

  /**
   * Language client status.
   */
  public get status(): ServerStatus {
    return this.wrappedStatus;
  }

  public set status(newStatus: ServerStatus) {
    if (this.wrappedStatus === newStatus) {
      return;
    }

    this.wrappedStatus = newStatus;
    this.onStatusChangeEmitter.fire(newStatus);
  }

  /**
   * Runs a Sorbet process using the current active configuration. Debounced so that it runs
   * Sorbet at most every MIN_TIME_BETWEEN_RETRIES_MS.
   */
  private async startSorbetProcess(workspaceFolder: vscode.WorkspaceFolder): Promise<ChildProcess> {
    this.context.log.info('Start Sorbet. Configuration:', this.context.configuration.lspConfigurationType);
    const lspConfig = buildLspConfiguration(this.context.configuration);
    if (!lspConfig) {
      throw new Error('Missing LSP configuration');
    }

    this.status = ServerStatus.INITIALIZING;
    this.context.log.info('>', lspConfig.cmd, ...lspConfig.args);

    this.sorbetProcess = spawnWithExitPromise(lspConfig.cmd, lspConfig.args, {
      cwd: workspaceFolder.uri.fsPath,
      env: { ...process.env, ...lspConfig?.env },
    });
    this.sorbetProcess.exit = this.sorbetProcess.exit.then((errorInfo) => {
      this.wrappedLastError = errorInfo;
      const pid = this.sorbetProcess?.process.pid ?? '«no pid»';
      if (errorInfo) {
        this.context.log.trace('Sorbet LSP process failed.', pid, errorInfo);
        this.status = ServerStatus.ERROR;
      } else {
        this.context.log.trace('Sorbet LSP process exited.', pid, this.sorbetProcess?.process.exitCode);
      }
      return errorInfo;
    });

    return this.sorbetProcess.process;
  }

  /** ErrorHandler interface */

  public error(): vslc.ErrorHandlerResult {
    return {
      action: vslc.ErrorAction.Shutdown,
      handled: true,
    };
  }

  public async closed(): Promise<vslc.CloseHandlerResult> {
    if (this.status !== ServerStatus.ERROR) {
      let restart = true;

      await this.sorbetProcess?.exit;
      const exitCode = this.sorbetProcess?.process.exitCode;
      switch (exitCode) {
        case 0:
          this.sorbetRestartReason = undefined;
          break;
        case 11:
          // Custom: 11 is a value picked for runner scripts.
          // This is kept for compat with Sorbet Extension.
          this.sorbetRestartReason = RestartReason.WRAPPER_REFUSED_SPAWN;
          break;
        case E_COMMAND_NOT_FOUND:
          this.sorbetRestartReason = undefined;
          restart = false;
          break;
        case E_SIGKILL:
        case E_SIGTERM:
          this.sorbetRestartReason = RestartReason.FORCIBLY_TERMINATED;
          break;
        default:
          this.sorbetRestartReason = RestartReason.CRASH_LC_CLOSED;
          this.context.log.error('Sorbet LSP process crashed. ExitCode:',
            this.sorbetProcess?.process.exitCode,
            '\nOnly Sorbet-specific C++ backtraces may be useful; other stacks are likely infrastructural.',
            '\nAdditional logs are written to the path specified by --debug-log-file, if set in your Sorbet LSP configuration.',
          );
          break;
      }

      this.status = restart ? ServerStatus.RESTARTING : ServerStatus.ERROR;
    }

    return {
      action: vslc.CloseAction.DoNotRestart,
      handled: true,
    };
  }
}
