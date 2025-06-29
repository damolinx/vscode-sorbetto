import { CancellationToken, Disposable, Event, EventEmitter, SymbolInformation, workspace } from 'vscode';
import {
  CloseAction,
  CloseHandlerResult,
  ErrorAction,
  ErrorHandler,
  ErrorHandlerResult,
  NotificationHandler,
  TextDocumentIdentifier,
  TextDocumentItem,
  TextDocumentPositionParams,
} from 'vscode-languageclient/node';
import { ChildProcess, spawn } from 'child_process';
import { instrumentLanguageClient } from './common/metrics';
import { buildLspConfiguration } from './configuration/lspConfiguration';
import { stopProcess } from './connections';
import { InitializationOptions } from './lsp/initializationOptions';
import { SorbetServerCapabilities } from './lsp/initializeResult';
import { createClient, SorbetClient } from './lsp/languageClient';
import { READ_FILE_REQUEST_METHOD } from './lsp/readFileRequest';
import { SHOW_SYMBOL_REQUEST_METHOD } from './lsp/showSymbolRequest';
import { SHOW_OPERATION_NOTIFICATION_METHOD, SorbetShowOperationParams } from './lsp/showOperationNotification';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, SorbetDidChangeConfigurationParams } from './lsp/workspaceDidChangeConfigurationNotification';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus, RestartReason } from './types';

const VALID_STATE_TRANSITIONS: ReadonlyMap<
  ServerStatus,
  ReadonlySet<ServerStatus>
> = new Map<ServerStatus, Set<ServerStatus>>([
  [
    ServerStatus.INITIALIZING,
    new Set([
      ServerStatus.ERROR,
      ServerStatus.RESTARTING,
      ServerStatus.RUNNING,
    ]),
  ],
  [
    ServerStatus.RUNNING,
    new Set([ServerStatus.ERROR, ServerStatus.RESTARTING]),
  ],
  [ServerStatus.DISABLED, new Set([ServerStatus.INITIALIZING])],
  // Restarting is a terminal state. The restart occurs by terminating this LanguageClient and creating a new one.
  [ServerStatus.RESTARTING, new Set()],
  // Error is a terminal state for this class.
  [ServerStatus.ERROR, new Set()],
]);

interface ErrorInfo {
  msg: string;
  code: string;
}

export class SorbetLanguageClient implements Disposable, ErrorHandler {
  private readonly context: SorbetExtensionContext;
  private readonly languageClient: SorbetClient;
  private readonly onStatusChangeEmitter: EventEmitter<ServerStatus>;
  // Sometimes this is an errno, not a process exit code. This happens when set
  // via the `.on("error")` handler, instead of the `.on("exit")` handler.
  private sorbetExitCode?: number;
  private sorbetProcess?: ChildProcess;
  private wrappedLastError?: ErrorInfo;
  private wrappedStatus: ServerStatus;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.languageClient = instrumentLanguageClient(
      createClient(context, () => this.startSorbetProcess(), this),
      this.context.metrics,
    );

    this.onStatusChangeEmitter = new EventEmitter();
    this.wrappedStatus = ServerStatus.INITIALIZING;
  }

  public dispose() {
    this.onStatusChangeEmitter.dispose();

    const afterStop = (tag: string) => {
      this.context.log.info('Stopped Sorbet process', this.sorbetProcess?.pid, ...tag);
      this.context.metrics.increment('stop.success', 1);
      this.sorbetProcess = undefined;
    };

    this.languageClient.stop().then(() => {
      // Forcefully stopping the Sorbet process as in some scenarios it might
      // still be running (give 5s)
      // TODO: This might be a legacy or large project requirement as in test
      // cases Sorbet process is already stopped by the time this code is hit.
      if (this.sorbetProcess && this.sorbetProcess.exitCode) {
        setTimeout(() => {
          if (this.sorbetProcess && (typeof this.sorbetProcess.exitCode !== 'number')) {
            stopProcess(this.sorbetProcess!, this.context.log)
              .then(() => afterStop('(force)'))
              .catch((err) => this.context.log.error('Failed to stop Sorbet process', err));
          } else {
            afterStop('(slow)');
          }
        }, 5000);
      } else {
        afterStop('');
      }
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
  public async start(): Promise<void> {
    if (!this.languageClient.needsStart()) {
      this.context.log.debug('Ignored unnecessary start request');
      return;
    }

    this.status = ServerStatus.INITIALIZING;
    await this.languageClient.start();

    // In case of error (missing Sorbet process), the client might have already
    // transitioned to Error or Restarting so this should not override that.
    if (this.status === ServerStatus.INITIALIZING) {
      this.status = ServerStatus.RUNNING;
    }
  }

  /**
   * Register a handler for 'workspace/didChangeConfiguration' notifications.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
   */
  public onDidChangeConfigurationNotification(handler: NotificationHandler<InitializationOptions>)
    : Disposable {
    return this.languageClient.onNotification(DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, handler);
  }

  /**
  * Register a handler for 'sorbet/showOperation' notifications.
  * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
  */
  public onShowOperationNotification(handler: NotificationHandler<SorbetShowOperationParams>)
    : Disposable {
    return this.languageClient.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, handler);
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChange(): Event<ServerStatus> {
    return this.onStatusChangeEmitter.event;
  }

  /**
 * Send a `sorbet/readFile` request to the language server.
 * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
 */
  public sendReadFileRequest(param: TextDocumentIdentifier, token?: CancellationToken)
    : Promise<TextDocumentItem | undefined> {
    return this.languageClient.sendRequest<TextDocumentItem>(
      READ_FILE_REQUEST_METHOD, param, token) ?? undefined;
  }

  /**
 * Send a `sorbet/showSymbol` request to the language server.
 * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request.
 */
  public sendShowSymbolRequest(param: TextDocumentPositionParams, token?: CancellationToken)
    : Promise<SymbolInformation | undefined> {
    return this.languageClient.sendRequest<SymbolInformation>(
      SHOW_SYMBOL_REQUEST_METHOD, param, token) ?? undefined;
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public sendDidChangeConfigurationNotification(param: SorbetDidChangeConfigurationParams)
    : Promise<void> {
    return this.languageClient.sendNotification(
      DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, param);
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

  private set status(newStatus: ServerStatus) {
    if (this.status === newStatus) {
      return;
    }

    if (!VALID_STATE_TRANSITIONS.get(this.status)?.has(newStatus)) {
      this.context.log.error(
        `Invalid Sorbet server transition: ${this.status} => ${newStatus}}`,
      );
    }

    this.wrappedStatus = newStatus;
    this.onStatusChangeEmitter.fire(newStatus);
  }

  /**
   * Runs a Sorbet process using the current active configuration. Debounced so that it runs
   * Sorbet at most every MIN_TIME_BETWEEN_RETRIES_MS.
   */
  private startSorbetProcess(): Promise<ChildProcess> {
    this.context.log.info('Start Sorbet. Configuration:', this.context.configuration.lspConfigurationType);
    const lspConfig = buildLspConfiguration(this.context.configuration);
    if (!lspConfig) {
      return Promise.reject('Missing LSP configuration');
    }
    if (workspace.workspaceFolders?.at(1)) {
      this.context.log.warn('Multi-root workspaces are unsupported, targeting first workspace:',
        workspace.workspaceFolders[0].name,
      );
    }

    this.context.log.info('>', lspConfig.cmd, ...lspConfig.args);
    this.sorbetProcess = spawn(
      lspConfig.cmd,
      lspConfig.args,
      {
        cwd: workspace.workspaceFolders?.at(0)?.uri.fsPath,
        env: { ...process.env, ...lspConfig?.env },
      });
    this.sorbetProcess.on(
      'exit',
      (code: number | null, _signal: string | null) => {
        this.sorbetExitCode = code ?? undefined;
      },
    ).on('error', (err?: NodeJS.ErrnoException) => {
      this.sorbetExitCode = err?.errno;
      this.sorbetProcess = undefined;
      if (err?.code === 'ENOENT' && this.status === ServerStatus.INITIALIZING) {
        this.context.metrics.increment('error.enoent', 1);
        this.wrappedLastError =
        {
          code: err.code,
          msg: `Failed to start Sorbet: ${err.message}`,
        };
        this.status = ServerStatus.ERROR;
      }
    });
    return Promise.resolve(this.sorbetProcess);
  }

  /** ErrorHandler interface */

  public error(): ErrorHandlerResult {
    if (this.status !== ServerStatus.ERROR) {
      this.status = ServerStatus.RESTARTING;
      this.context.clientManager.restartSorbet(RestartReason.CRASH_LC_ERROR);
    }
    return {
      action: ErrorAction.Shutdown,
      handled: true,
    };
  }

  public closed(): CloseHandlerResult {
    if (this.status !== ServerStatus.ERROR) {
      let reason: RestartReason;
      if (this.sorbetExitCode === 11) {
        // 11 number chosen somewhat arbitrarily. Most important is that this doesn't
        // clobber the exit code of Sorbet itself (which means Sorbet cannot return 11).
        //
        // The only thing that matters is that this value is kept in sync with any
        // wrapper scripts that people use with Sorbet. If this number has to
        // change for some reason, we should announce that.
        reason = RestartReason.WRAPPER_REFUSED_SPAWN;
      } else if (this.sorbetExitCode === 143) {
        // 143 = 128 + 15 and 15 is TERM signal
        reason = RestartReason.FORCIBLY_TERMINATED;
      } else {
        reason = RestartReason.CRASH_LC_CLOSED;
        this.context.log.error(
          'The Sorbet LSP process crashed exit_code',
          this.sorbetExitCode,
        );
        this.context.log.error(
          'The Node.js backtrace above is not useful.',
          'If there is a C++ backtrace above, that is useful.',
          'Otherwise, more useful output will be in the --debug-log-file to the Sorbet process',
          '(if provided as a command-line argument).',
        );
      }

      this.status = ServerStatus.RESTARTING;
      this.context.clientManager.restartSorbet(reason);
    }

    return {
      action: CloseAction.DoNotRestart,
      handled: true,
    };
  }
}
