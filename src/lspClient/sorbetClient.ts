import * as vscode from 'vscode';
import * as vslcn from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { E_COMMAND_NOT_FOUND, ErrorInfo } from '../common/processUtils';
import { ExtensionContext } from '../extensionContext';
import { HIERARCHY_REFERENCES_REQUEST } from '../lsp/hierarchyReferences';
import { InitializationOptions } from '../lsp/initializationOptions';
import { SorbetServerCapabilities } from '../lsp/initializeResult';
import { SorbetLanguageClient } from '../lsp/languageClient';
import { READ_FILE_REQUEST } from '../lsp/readFileRequest';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  SorbetShowOperationParams,
} from '../lsp/showOperationNotification';
import { SHOW_SYMBOL_REQUEST } from '../lsp/showSymbolRequest';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD } from '../lsp/workspaceDidChangeConfigurationNotification';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClientConfiguration } from './configuration/sorbetClientConfiguration';
import { InitializeProcessResult, LanguageClientCreator } from './languageClientCreator';
import { RestartWatcher } from './restartWatcher';
import { ShowOperationEvent } from './showOperationEvent';
import { SorbetClientId } from './sorbetClientId';
import { SorbetClientStatus } from './sorbetClientStatus';
import { StatusChangedEvent } from './statusChangedEvent';

const THROTTLE_CONFIG = {
  baseDelayMs: 10000, // 10 seconds
  attemptsPerTier: 30, // 5 minutes @ 10s base
  maxDelayMs: 30000, // 30 seconds
} as const;

export class SorbetClient implements vscode.Disposable {
  private clientStatus?: SorbetClientStatus;
  private clientSession?: {
    client: SorbetLanguageClient;
    disposables: vscode.Disposable[];
  };

  public readonly configuration: SorbetClientConfiguration;
  private readonly context: ExtensionContext;
  private readonly disposables: vscode.Disposable[];
  public readonly id: SorbetClientId;
  private languageClientInitializer?: LanguageClientCreator;
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;
  private readonly restartWatcher: RestartWatcher;
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  constructor(
    id: SorbetClientId,
    context: ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
  ) {
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
   * The {@link SorbetServerCapabilities capabilities} the Sorbet Language Server
   * provides. Only available when the server has been initialized.
   */
  public get capabilities(): SorbetServerCapabilities | undefined {
    return this.languageClient?.initializeResult?.capabilities;
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
        if (this.configuration.highlightUntypedCode) {
          await this.sendDidChangeConfigurationNotification({
            highlightUntyped: this.configuration.highlightUntypedCode,
          });
        }
        break;
      case 'highlightUntypedCodeDiagnosticSeverity':
        if (this.configuration.highlightUntypedCodeDiagnosticSeverity) {
          await this.sendDidChangeConfigurationNotification({
            highlightUntypedDiagnosticSeverity:
              this.configuration.highlightUntypedCodeDiagnosticSeverity,
          });
        }
        break;
      default:
        await this.restart();
        break;
    }
  }

  public isActive(): boolean {
    return this.status !== SorbetClientStatus.Disabled;
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
  public get onShowOperation(): vscode.Event<ShowOperationEvent> {
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChanged(): vscode.Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
  }

  /**
   * Current Sorbet Language Client. Only available while the server is running.
   */
  public get languageClient(): SorbetLanguageClient | undefined {
    return this.clientSession?.client;
  }

  private set languageClient(value: SorbetLanguageClient | undefined) {
    if (this.clientSession?.client === value) {
      return;
    }

    if (this.clientSession) {
      vscode.Disposable.from(...this.clientSession.disposables).dispose();
      this.clientSession = undefined;
      this.status = SorbetClientStatus.Disabled;
    }

    if (value) {
      this.clientSession = {
        client: value,
        disposables: [
          value, // Assumes ownership of LanguageClient
          value.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, (params) =>
            this.onShowOperationEmitter.fire({ client: this, params })
          ),
          value.onDidChangeState((event) => {
            switch (event.newState) {
              case vslcn.State.Running:
                this.context.log.trace(
                  'LSP client state changed to Running',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = SorbetClientStatus.Running;
                break;
              case vslcn.State.Starting:
                this.context.log.trace(
                  'LSP client state changed to Starting',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = SorbetClientStatus.Initializing;
                break;
              case vslcn.State.Stopped:
                this.context.log.trace(
                  'LSP client state changed to Stopped',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = SorbetClientStatus.Disabled;
                break;
            }
          }),
        ],
      };
    }
  }

  /**
   * Sorbet Language Client operations stack.
   */
  public get operations(): readonly Readonly<SorbetShowOperationParams>[] {
    return this.clientSession?.client.operations ?? [];
  }

  /**
   * Sorbet Language Client status.
   */
  public get status(): SorbetClientStatus {
    return this.clientStatus ?? SorbetClientStatus.Disabled;
  }

  private set status(value: SorbetClientStatus) {
    if (this.clientStatus !== value) {
      this.clientStatus = value;
      this.onStatusChangedEmitter.fire({ client: this, status: value });
    }
  }

  /**
   * Restarts the Sorbet LSP client if running, or starts it if not.
   */
  public async restart() {
    this.context.metrics.increment('restart', 1);
    await this.stop();
    await this.start();
  }

  /**
   * Starts the Sorbet LSP client if it is not already running, or disabled.
   */
  public async start() {
    const logPrefix =
      this.context.clientManager.clientCount > 1 ? `[${this.workspaceFolder.name}] ` : '';
    if (this.languageClient) {
      this.context.log.debug(`${logPrefix}Ignored start request, already running.`);
      return;
    } else if (this.configuration.lspConfigurationType === LspConfigurationType.Disabled) {
      this.context.log.info(`${logPrefix}Ignored start request, disabled by configuration.`);
      return;
    }

    await withLock(this, async () => {
      let retryTimestamp = 0;
      let retry = false;
      let retryAttempt = 0;

      this.languageClientInitializer = new LanguageClientCreator(
        this.context,
        this.workspaceFolder,
        this.configuration,
      );

      do {
        retryTimestamp = await throttle(retryAttempt, retryTimestamp, this.context.log);
        this.context.log.debug(`${logPrefix}Start attempt`, 1 + retryAttempt);

        let lspProcess: InitializeProcessResult | undefined;
        try {
          this.status = SorbetClientStatus.Initializing;
          const { client, result: lspProcess } = await this.languageClientInitializer.create();
          if (lspProcess.hasExited) {
            if (lspProcess.exitedWithLegacyRetryCode) {
              this.context.log.warn(
                `${logPrefix}Sorbet language server exited on startup with retryable exit code:`,
                lspProcess.process.exitCode,
              );
              retry = true;
            } else {
              this.context.log.error(
                `${logPrefix}Sorbet language server exited on startup. Check configuration:`,
                this.configuration.lspConfigurationType,
              );
              retry = false;
            }
            this.status = SorbetClientStatus.Error;
            this.languageClient = undefined;
          } else {
            this.languageClient = client;
            this.status = SorbetClientStatus.Running;
            this.context.metrics.increment('start', 1);
            retry = false;
          }
        } catch (err) {
          const errorInfo = await lspProcess?.exit;
          if (errorInfo && isUnrecoverable(errorInfo)) {
            this.status = SorbetClientStatus.Disabled;
            this.context.log.error(
              `${logPrefix}Sorbet LSP failed to start with unrecoverable error.`,
              errorInfo.code || errorInfo.errno,
            );
            retry = false;
          } else {
            this.status = SorbetClientStatus.Error;
            this.context.log.error(
              `${logPrefix}Sorbet LSP failed to start but will retry.`,
              (errorInfo && (errorInfo.code || errorInfo.errno)) || err,
            );
            retry = true;
          }
          this.languageClient = undefined;
        }
      } while (retry && ++retryAttempt < Number.MAX_SAFE_INTEGER);

      this.languageClientInitializer = undefined;
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
   */
  public async stop() {
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
    } else if (this.languageClientInitializer) {
      if (this.languageClientInitializer.lspProcess) {
        const killed = this.languageClientInitializer.lspProcess.kill();
        if (killed !== undefined && !killed) {
          throw new Error(
            `Zombie initialization with pid: ${this.languageClientInitializer.lspProcess?.process.pid}`,
          );
        } else {
          this.context.log.debug(`${logPrefix}Zombie initializer but no associated process.`);
          this.languageClientInitializer = undefined;
        }
      }
    } else {
      this.context.log.info(`${logPrefix}Ignored stop request, not running.`);
    }

    this.status = SorbetClientStatus.Disabled;
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
   * Send a `sorbet/hierarchyReferences` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbethierarchyreferences-request
   */
  public async sendHierarchyReferences(
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
    const locations = await this.languageClient?.sendRequest(
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
    const content = await this.languageClient?.sendRequest(READ_FILE_REQUEST, params, token);
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

    const symbolInfo = await this.languageClient?.sendRequest(SHOW_SYMBOL_REQUEST, params, token);

    return symbolInfo ?? undefined;
  }
}
