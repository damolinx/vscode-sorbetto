import * as vscode from 'vscode';
import * as vslcn from 'vscode-languageclient/node';
import { SorbetClient } from '../client/sorbetClient';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  SorbetShowOperationParams,
} from '../client/spec/showOperationNotification';
import { Log } from '../common/log';
import { E_COMMAND_NOT_FOUND, ErrorInfo } from '../common/processUtils';
import { ExtensionContext } from '../extensionContext';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClientConfiguration } from './configuration/sorbetClientConfiguration';
import { ShowOperationEvent } from './events/showOperationEvent';
import { StatusChangedEvent } from './events/statusChangedEvent';
import { InitializeProcessResult, LanguageClientCreator } from './languageClientCreator';
import { RestartWatcher } from './restartWatcher';
import { createClientHostId } from './sorbetClientHostId';
import { SorbetClientStatus } from './sorbetClientStatus';
import { WorkspaceScopedOutputChannel } from './workspaceScopedOutputChannel';

const THROTTLE_CONFIG = {
  baseDelayMs: 10000, // 10 seconds
  attemptsPerTier: 30, // 5 minutes @ 10s base
  maxDelayMs: 30000, // 30 seconds
} as const;

/**
 * Hosts the {@link SorbetClient Sorbet language client} for a given workspace folder.
 * The client may be created and disposed in response to diverse events so this provides
 * a stable, long‑lived façade that extension code can interact with.
 */
export class SorbetClientHost implements vscode.Disposable {
  private clientStatus?: SorbetClientStatus;
  private clientSession?: {
    client: SorbetClient;
    disposables: vscode.Disposable[];
  };

  public readonly configuration: SorbetClientConfiguration;
  private readonly disposables: vscode.Disposable[];
  private languageClientInitializer?: LanguageClientCreator;
  private readonly log: vscode.LogOutputChannel & Log;
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;
  private readonly restartWatcher: RestartWatcher;

  constructor(
    private readonly context: ExtensionContext,
    public readonly workspaceFolder: vscode.WorkspaceFolder,
    public readonly id = createClientHostId(workspaceFolder),
  ) {
    this.log = new WorkspaceScopedOutputChannel(this.context.log, this.workspaceFolder);
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();

    this.configuration = new SorbetClientConfiguration(workspaceFolder);
    this.configuration.onDidChangeLspConfig(() => this.handleLspConfigurationChanged());
    this.configuration.onDidChangeLspOptions((option) => this.handleLspOptionChanged(option));

    this.restartWatcher = new RestartWatcher(this, this.log);

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

  private async handleLspConfigurationChanged(): Promise<void> {
    await this.stop();
    if (this.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
      await this.start();
    }
  }

  private async handleLspOptionChanged(option: string): Promise<void> {
    switch (option) {
      case 'highlightUntypedCode':
        if (this.configuration.highlightUntypedCode) {
          await this.languageClient?.sendDidChangeConfigurationNotification({
            highlightUntyped: this.configuration.highlightUntypedCode,
          });
        }
        break;
      case 'highlightUntypedCodeDiagnosticSeverity':
        if (this.configuration.highlightUntypedCodeDiagnosticSeverity) {
          await this.languageClient?.sendDidChangeConfigurationNotification({
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
  public get languageClient(): SorbetClient | undefined {
    return this.clientSession?.client;
  }

  private set languageClient(value: SorbetClient | undefined) {
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
            this.onShowOperationEmitter.fire({
              clientHost: this,
              operation: params,
            }),
          ),
          value.onDidChangeState((event) => {
            switch (event.newState) {
              case vslcn.State.Running:
                this.log.trace(
                  'LSP client state changed to Running',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = SorbetClientStatus.Running;
                break;
              case vslcn.State.Starting:
                this.log.trace(
                  'LSP client state changed to Starting',
                  this.workspaceFolder.uri.toString(true),
                );
                this.status = SorbetClientStatus.Initializing;
                break;
              case vslcn.State.Stopped:
                this.log.trace(
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
      this.onStatusChangedEmitter.fire({
        clientHost: this,
        status: value,
      });
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
    if (this.languageClient) {
      this.log.debug('Ignored start request, already running.');
      return;
    } else if (this.configuration.lspConfigurationType === LspConfigurationType.Disabled) {
      this.log.info('Ignored start request, disabled by configuration.');
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
        this.log,
      );

      do {
        retryTimestamp = await throttle(retryAttempt, retryTimestamp, this.log);
        this.log.debug('Start attempt', 1 + retryAttempt);

        let lspProcess: InitializeProcessResult | undefined;
        try {
          this.status = SorbetClientStatus.Initializing;
          const { client, result: lspProcess } = await this.languageClientInitializer.create();
          if (lspProcess.hasExited) {
            if (lspProcess.exitedWithLegacyRetryCode) {
              this.log.warn(
                'Sorbet language server exited on startup with retryable exit code:',
                lspProcess.process.exitCode,
              );
              retry = true;
            } else {
              this.log.error(
                'Sorbet language server exited on startup. Check configuration:',
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
            this.log.error(
              'Sorbet LSP failed to start with unrecoverable error.',
              errorInfo.code || errorInfo.errno,
            );
            retry = false;
          } else {
            this.status = SorbetClientStatus.Error;
            this.log.error(
              'Sorbet LSP failed to start but will retry.',
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
          log.debug('Start throttled —', sleepMS, 'ms');
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
    if (this.languageClient) {
      if (this.languageClient.needsStop()) {
        await this.languageClient.stop().then(
          () => this.log.info('Stopped client'),
          (reason) => {
            this.context.metrics.increment('stop.failed', 1);
            throw reason;
          },
        );
      } else {
        this.log.debug('Ignored stop request, stop not required.');
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
          this.log.debug('Zombie initializer but no associated process.');
          this.languageClientInitializer = undefined;
        }
      }
    } else {
      this.log.info('Ignored stop request, not running.');
    }

    this.status = SorbetClientStatus.Disabled;
    this.context.metrics.increment('stop', 1);
  }
}
