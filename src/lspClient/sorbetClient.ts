import * as vscode from 'vscode';
import * as vslcn from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { E_COMMAND_NOT_FOUND, ErrorInfo } from '../common/processUtils';
import { InitializationOptions } from '../lsp/initializationOptions';
import { READ_FILE_REQUEST_METHOD } from '../lsp/readFileRequest';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  SorbetShowOperationParams,
} from '../lsp/showOperationNotification';
import { SHOW_SYMBOL_REQUEST_METHOD } from '../lsp/showSymbolRequest';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD } from '../lsp/workspaceDidChangeConfigurationNotification';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { LspStatus } from '../types';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClientConfiguration } from './configuration/sorbetClientConfiguration';
import { InitializeProcessResult, LanguageClientCreator } from './languageClientCreator';
import { RestartWatcher } from './restartWatcher';
import { ShowOperationEvent } from './showOperationEvent';
import { SorbetClientId } from './sorbetClientId';
import { StatusChangedEvent } from './statusChangedEvent';

const THROTTLE_CONFIG = {
  baseDelayMs: 10000, // 10 seconds
  attemptsPerTier: 30, // 5 minutes @ 10s base
  maxDelayMs: 30000, // 30 seconds
} as const;

/**
 * Sorbet LSP server timeout before forcefully killing the process.
 */
export const SORBET_CLIENT_DISPOSE_TIMEOUT_MS = 5000;

export class SorbetClient implements vscode.Disposable {
  private _languageClient?: {
    client: vslcn.LanguageClient;
    disposables: vscode.Disposable[];
  };
  private _languageClientInitializer?: LanguageClientCreator;
  private _operations: SorbetShowOperationParams[];
  private _status: LspStatus;

  public readonly configuration: SorbetClientConfiguration;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  public readonly id: SorbetClientId;
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;
  private readonly restartWatcher: RestartWatcher;
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  constructor(
    id: SorbetClientId,
    context: SorbetExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
  ) {
    this._operations = [];
    this._status = LspStatus.Disabled;
    this.context = context;
    this.id = id;
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.workspaceFolder = workspaceFolder;

    this.configuration = new SorbetClientConfiguration(workspaceFolder);
    this.configuration.onDidChangeLspConfig(() => this.handleLspConfigurationChanged());
    this.configuration.onDidChangeLspOptions((option) => this.handleLspOptionChanged(option));

    this.restartWatcher = new RestartWatcher(this, this.context.log);

    this.disposables = [
      this.configuration,
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      this.restartWatcher,
      { dispose: () => (this.languageClient = undefined) },
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  /**
   * Raise {@link onShowOperation} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified. Spurious events are filtered out.
   */
  private fireOnShowOperation(params: SorbetShowOperationParams): void {
    let changed = false;
    if (params.status === 'end') {
      const filteredOps = this._operations.filter(
        (ops) => ops.operationName !== params.operationName,
      );
      if (filteredOps.length !== this._operations.length) {
        this._operations = filteredOps;
        changed = true;
      }
    } else {
      this._operations.push(params);
      changed = true;
    }

    if (changed) {
      this.onShowOperationEmitter.fire({ client: this, params });
    }
  }

  /**
   * Raise {@link onServerStatusChanged} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified.
   */
  private fireOnStatusChanged(): void {
    if (this.status === LspStatus.Disabled) {
      this._operations = [];
    }
    this.onStatusChangedEmitter.fire({ client: this, status: this.status });
  }

  private async handleLspConfigurationChanged(): Promise<void> {
    if (this.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
      await this.restart();
    } else {
      await this.stop();
    }
  }

  private async handleLspOptionChanged(option: string): Promise<void> {
    switch (option) {
      case 'highlightUntypedCode':
        await this.sendDidChangeConfigurationNotification({
          highlightUntyped: this.configuration.highlightUntypedCode,
        });
        break;
      case 'highlightUntypedCodeDiagnosticSeverity':
        await this.sendDidChangeConfigurationNotification({
          highlightUntypedDiagnosticSeverity:
            this.configuration.highlightUntypedCodeDiagnosticSeverity,
        });
        break;
      default:
        await this.restart();
        break;
    }
  }

  public isEnabledByConfiguration(): boolean {
    return this.configuration.lspConfigurationType !== LspConfigurationType.Disabled;
  }

  /**
   * Evaluates if {@link uri} is in scope of {@link workspaceFolder}.
   */
  public inScope(uri: vscode.Uri): boolean {
    return vscode.workspace.getWorkspaceFolder(uri)?.name === this.workspaceFolder.name;
  }

  /**
   * Register a handler for 'sorbet/showOperation' notifications.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
   */
  public get onShowOperationNotification(): vscode.Event<ShowOperationEvent> {
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChanged(): vscode.Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
  }

  public get languageClient(): vslcn.LanguageClient | undefined {
    return this._languageClient?.client;
  }

  private set languageClient(value: vslcn.LanguageClient | undefined) {
    if (this._languageClient?.client === value) {
      return;
    }

    if (this._languageClient) {
      vscode.Disposable.from(...this._languageClient.disposables).dispose();
      this._languageClient = undefined;
      this.status = LspStatus.Disabled;
    }

    if (value) {
      this._languageClient = {
        client: value,
        disposables: [
          value, // Presumes ownership of LanguageClient
          value.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, (params) =>
            this.fireOnShowOperation(params),
          ),
          value.onDidChangeState((event) => {
            switch (event.newState) {
              case vslcn.State.Running:
                this.context.log.trace(
                  'LSP client state changed to Running',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = LspStatus.Running;
                break;
              case vslcn.State.Starting:
                this.context.log.trace(
                  'LSP client state changed to Starting',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = LspStatus.Initializing;
                break;
              case vslcn.State.Stopped:
                this.context.log.trace(
                  'LSP client state changed to Stopped',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = LspStatus.Disabled;
                this.restartWatcher.disable();
                break;
            }
          }),
        ],
      };
    }
  }

  /**
   * Sorbet client current operation stack.
   */
  public get operations(): readonly Readonly<SorbetShowOperationParams>[] {
    return this._operations;
  }

  public get status(): LspStatus {
    return this._status;
  }

  public set status(value: LspStatus) {
    if (this._status !== value) {
      this._status = value;
      this.fireOnStatusChanged();
    }
  }

  /**
   * Restarts the Sorbet LSP client if running, or starts it if not.
   */
  public async restart() {
    this.context.metrics.increment('restart', 1);
    await this.stop(true);
    await this.start();
  }

  /**
   * Starts the Sorbet LSP client if it is not already running, or disabled.
   */
  public async start() {
    const logPrefix =
      this.context.clientManager.clientCount > 1 ? `[${this.workspaceFolder.name}] ` : '';
    if (this.languageClient) {
      this.context.log.info(`${logPrefix}Ignored start request, already running.`);
      return;
    } else if (this.configuration.lspConfigurationType === LspConfigurationType.Disabled) {
      this.context.log.info(`${logPrefix}Ignored start request, disabled by configuration.`);
      return;
    }

    await withLock(this, async () => {
      let retryTimestamp = 0;
      let retry = false;
      let retryAttempt = 0;

      this._languageClientInitializer = new LanguageClientCreator(
        this.context,
        this.workspaceFolder,
        this.configuration,
      );

      do {
        retryTimestamp = await throttle(retryAttempt, retryTimestamp, this.context.log);
        this.context.log.debug(`${logPrefix}Start attempt —`, 1 + retryAttempt);

        let lspProcess: InitializeProcessResult | undefined;
        try {
          this.status = LspStatus.Initializing;
          const { client, result: lspProcess } = await this._languageClientInitializer.create();
          if (lspProcess.hasExited) {
            if (lspProcess.exitedWithLegacyRetryCode) {
              this.context.log.warn(
                `${logPrefix}Sorbet LSP exited after startup with a retryable exit code:`,
                lspProcess.process.exitCode,
              );
              retry = true;
            } else {
              this.context.log.error(
                `${logPrefix}Sorbet LSP exited after startup. Check configuration:`,
                this.configuration.lspConfigurationType,
              );
              retry = false;
            }
            this.status = LspStatus.Error;
            this.languageClient = undefined;
          } else {
            this.languageClient = client;
            this.status = LspStatus.Running;
            this.restartWatcher.enable();
            this.context.metrics.increment('start', 1);
            retry = false;
          }
        } catch (err) {
          const errorInfo = await lspProcess?.exit;
          if (errorInfo && isUnrecoverable(errorInfo)) {
            this.status = LspStatus.Disabled;
            this.context.log.error(
              `${logPrefix}Sorbet LSP failed to start with unrecoverable error.`,
              errorInfo.code || errorInfo.errno,
            );
            retry = false;
          } else {
            this.status = LspStatus.Error;
            this.context.log.error(
              `${logPrefix}Sorbet LSP failed to start but will retry.`,
              (errorInfo && (errorInfo.code || errorInfo.errno)) || err,
            );
            retry = true;
          }
          this.languageClient = undefined;
        }
      } while (retry && ++retryAttempt < Number.MAX_SAFE_INTEGER);

      this._languageClientInitializer = undefined;
    });

    function isUnrecoverable(errorInfo: ErrorInfo): boolean {
      return (
        errorInfo &&
        ((errorInfo.code !== undefined && ['EACCES', 'ENOENT'].includes(errorInfo.code)) ||
          errorInfo.errno === E_COMMAND_NOT_FOUND)
      );
    }

    async function throttle(
      attempt: number,
      previous: number,
      log: Log,
      opts = THROTTLE_CONFIG,
    ): Promise<number> {
      if (attempt > 0) {
        const delay = Math.min(
          opts.maxDelayMs,
          opts.baseDelayMs * Math.pow(2, Math.floor(attempt / opts.attemptsPerTier)),
        );
        const sleepMS = delay - (Date.now() - previous);
        if (sleepMS > 0) {
          log.debug(`${logPrefix}Start throttled —`, sleepMS, 'ms');
          await new Promise((res) => setTimeout(res, sleepMS));
        }
      }

      return Date.now();
    }

    async function withLock(context: any, task: () => Promise<void>): Promise<void> {
      if (!context['__startLock']) {
        context['__startLock'] = true;
        try {
          await task();
        } finally {
          delete context['__startLock'];
        }
      }
    }
  }

  /**
   * Stops the Sorbet LSP client if it is running.
   * @param restarting Stop is part of a restart operation. This allows to
   * selectively clean-up resources.
   */
  public async stop(restarting?: true) {
    const logPrefix =
      this.context.clientManager.clientCount > 1 ? `[${this.workspaceFolder.name}] ` : '';
    if (this.languageClient) {
      if (this.languageClient.needsStop()) {
        await this.languageClient.stop().then(
          () => this.context.log.info(`${logPrefix}Stopped client`),
          (reason) => {
            this.context.metrics.increment('stop.failed', 1);
            throw reason;
          },
        );
      } else {
        this.context.log.debug(`${logPrefix}Ignored stop request, stop not required.`);
      }
      this.languageClient = undefined;
    } else if (this._languageClientInitializer) {
      if (this._languageClientInitializer.lspProcess) {
        const killed = this._languageClientInitializer.lspProcess.kill();
        if (killed !== undefined && !killed) {
          throw new Error(
            `Zombie initialization with pid: ${this._languageClientInitializer.lspProcess?.process.pid}`,
          );
        } else {
          this.context.log.debug(`${logPrefix}Zombie initializer but no associated process.`);
          this._languageClientInitializer = undefined;
        }
      }
    } else {
      this.context.log.info(`${logPrefix}Ignored stop request, not running.`);
    }

    this.status = LspStatus.Disabled;
    if (!restarting) {
      this.restartWatcher.disable();
    }
    this.context.metrics.increment('stop', 1);
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public async sendDidChangeConfigurationNotification(param: InitializationOptions): Promise<void> {
    await this.languageClient?.sendNotification(DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, {
      settings: param,
    });
  }

  /**
   * Send a `sorbet/readFile` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
   */
  public async sendReadFileRequest(
    param: vslcn.TextDocumentIdentifier,
    token?: vscode.CancellationToken,
  ): Promise<vslcn.TextDocumentItem | undefined> {
    const content = await this.languageClient?.sendRequest<vslcn.TextDocumentItem>(
      READ_FILE_REQUEST_METHOD,
      param,
      token,
    );
    return content ?? undefined;
  }

  /**
   * Send a `sorbet/showSymbol` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetshowsymbol-request.
   */
  public async sendShowSymbolRequest(
    param: vslcn.TextDocumentPositionParams,
    token?: vscode.CancellationToken,
  ): Promise<vslcn.SymbolInformation | undefined> {
    const symbolInfo = await this.languageClient?.sendRequest<vslcn.SymbolInformation>(
      SHOW_SYMBOL_REQUEST_METHOD,
      param,
      token,
    );
    return symbolInfo ?? undefined;
  }
}
