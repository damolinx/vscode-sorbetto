import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient/node';
import { Log } from './common/log';
import { E_COMMAND_NOT_FOUND, ErrorInfo } from './common/processUtils';
import { ClientConfiguration } from './configuration/clientConfiguration';
import { buildLspConfiguration } from './configuration/lspConfiguration';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { InitializeProcessResult, LanguageClientInitializer } from './languageClientInitializer';
import { InitializationOptions } from './lsp/initializationOptions';
import { SorbetLanguageClient } from './lsp/languageClient';
import { READ_FILE_REQUEST_METHOD } from './lsp/readFileRequest';
import {
  SorbetShowOperationParams,
  SHOW_OPERATION_NOTIFICATION_METHOD,
} from './lsp/showOperationNotification';
import { SHOW_SYMBOL_REQUEST_METHOD } from './lsp/showSymbolRequest';
import { DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD } from './lsp/workspaceDidChangeConfigurationNotification';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { LspStatus } from './types';

export type ClientId = string & { __clientIdBrand: never };
export function createClientId(workspaceFolder: vscode.WorkspaceFolder): ClientId {
  return workspaceFolder.uri.toString() as ClientId;
}

const MAX_RETRIES = 38; // About 15min, base 10s and cap 60s
const THROTTLE_CONFIG = {
  baseDelayMs: 10000,
  attemptsPerTier: 12,
  maxDelayMs: 60000,
} as const;

/**
 * Sorbet LSP server timeout before forcefully killing the process.
 */
export const SORBET_CLIENT_DISPOSE_TIMEOUT_MS = 5000;

export class Client implements vscode.Disposable {
  private _client?: SorbetLanguageClient;
  private _clientDisposable?: vscode.Disposable;
  private _status: LspStatus;

  public readonly configuration: ClientConfiguration;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onShowOperationEmitter: vscode.EventEmitter<{
    client: Client;
    params: SorbetShowOperationParams;
  }>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<{
    client: Client;
    status: LspStatus;
  }>;
  private restartWatchers?: vscode.FileSystemWatcher[];
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  constructor(context: SorbetExtensionContext, workspaceFolder: vscode.WorkspaceFolder) {
    this._status = LspStatus.Disabled;
    this.configuration = new ClientConfiguration(workspaceFolder);
    this.context = context;
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.workspaceFolder = workspaceFolder;
    this.disposables = [
      this.configuration,
      this.configuration.onDidChangeLspConfig(() => this.handleLspConfigurationChanged()),
      this.configuration.onDidChangeLspOptions((option) => this.handleLspOptionChanged(option)),
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      {
        dispose: () => {
          this._clientDisposable?.dispose();
          this._client?.dispose(SORBET_CLIENT_DISPOSE_TIMEOUT_MS);
        },
      },
    ];
  }

  dispose(): void {
    this.disposeRestartWatchers();
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private disposeRestartWatchers() {
    if (this.restartWatchers) {
      vscode.Disposable.from(...this.restartWatchers).dispose();
      this.context.log.trace('Disposed restart FS watchers', this.restartWatchers.length);
      this.restartWatchers = undefined;
    }
  }

  private startRestartWatchers(restart?: true): void {
    if (this.restartWatchers && !restart) {
      this.context.log.debug(
        'Ignored restart-watcher creation request, already exists',
        this.restartWatchers.length,
        this.workspaceFolder.uri,
      );
      return;
    }

    const onChangeListener = () => this.restart();
    this.restartWatchers = this.configuration.restartFilePatterns.map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(onChangeListener);
      watcher.onDidCreate(onChangeListener);
      watcher.onDidDelete(onChangeListener);
      return watcher;
    });
    this.context.log.trace('Created restart FS watchers', this.restartWatchers.length);
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
      case 'restartFilePatterns':
        this.startRestartWatchers(true);
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
   * Evaluates if {@link uri} is in scope of {@link workspaceFolder}. If {@link uri}
   * is missing, it defaults to `vscode.window.activeTextEditor`'s.
   */
  public inScope(uri?: vscode.Uri): boolean {
    const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    return (
      !!targetUri &&
      vscode.workspace.getWorkspaceFolder(targetUri)?.name === this.workspaceFolder.name
    );
  }

  /**
   * Register a handler for 'sorbet/showOperation' notifications.
   * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
   */
  public get onShowOperationNotification(): vscode.Event<{
    client: Client;
    params: SorbetShowOperationParams;
  }> {
    //return this.lspClient.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, handler);
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChanged(): vscode.Event<{ client: Client; status: LspStatus }> {
    return this.onStatusChangedEmitter.event;
  }

  public get lspClient(): SorbetLanguageClient | undefined {
    return this._client;
  }

  public set lspClient(value: SorbetLanguageClient | undefined) {
    if (this._client !== value) {
      this._clientDisposable?.dispose();
      this._client?.dispose();

      this._client = value;
      if (this._client) {
        this._clientDisposable = this._client.onNotification(
          SHOW_OPERATION_NOTIFICATION_METHOD,
          (params) => this.onShowOperationEmitter.fire({ client: this, params }),
        );
      }
    }
  }

  public get status(): LspStatus {
    return this._status;
  }

  public set status(value: LspStatus) {
    if (this._status !== value) {
      this._status = value;
      this.onStatusChangedEmitter.fire({ client: this, status: value });
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
   * Starts the Sorbet LSP client if it is not already running.
   */
  public async start() {
    if (this.lspClient) {
      this.context.log.debug('Ignored start request, already running.', this.workspaceFolder.uri);
      return;
    }

    const configuration = await buildLspConfiguration(this.configuration);
    if (!configuration) {
      throw new Error('Missing start configuration');
    }

    const initializer = new LanguageClientInitializer(
      this.context,
      this.workspaceFolder,
      configuration,
    );

    await withLock(this, async () => {
      let retryTimestamp = 0;
      let retry = false;
      let retryAttempt = 0;

      do {
        retryTimestamp = await throttle(retryAttempt, retryTimestamp, this.context.log);
        this.context.log.debug('Start attempt —', 1 + retryAttempt, 'of', MAX_RETRIES);

        let lspProcess: InitializeProcessResult | undefined;
        try {
          this.status = LspStatus.Initializing;
          lspProcess = await initializer.initialize();
          if (lspProcess.hasExited) {
            if (lspProcess.exitedWithLegacyRetryCode) {
              this.context.log.warn(
                'Sorbet LSP exited after startup with a retryable exit code:',
                lspProcess.process.exitCode,
              );
              retry = true;
            } else {
              this.context.log.error(
                'Sorbet LSP exited after startup. Check configuration:',
                this.configuration.lspConfigurationType,
              );
              retry = false;
            }
            this.status = LspStatus.Error;
            this.lspClient = undefined;
          } else {
            this.lspClient = initializer.lspClient;
            this.status = LspStatus.Running;
            this.startRestartWatchers();
            this.context.metrics.increment('start', 1);
            retry = false;
          }
        } catch (err) {
          const errorInfo = await lspProcess?.exit;
          if (errorInfo && isUnrecoverable(errorInfo)) {
            this.status = LspStatus.Disabled;
            this.context.log.error(
              'Sorbet LSP failed to start with unrecoverable error.',
              errorInfo.code || errorInfo.errno,
            );
            retry = false;
          } else {
            this.status = LspStatus.Error;
            this.context.log.error(
              'Sorbet LSP failed to start but will retry.',
              (errorInfo && (errorInfo.code || errorInfo.errno)) || err,
            );
            retry = true;
          }
          this.lspClient = undefined;
        }
      } while (retry && ++retryAttempt < MAX_RETRIES);
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
   * @param restarting Stop is part of a restart operation. This allows to
   * selectively clean-up resources.
   */
  public async stop(restarting?: true) {
    if (!this.lspClient) {
      this.context.log.debug('Ignored stop request, not running.', this.workspaceFolder.uri);
      return;
    }

    await this.lspClient.stop().then(
      () => {
        this.lspClient = undefined;
        this.status = LspStatus.Disabled;
        if (!restarting) {
          this.disposeRestartWatchers();
        }
        this.context.metrics.increment('stop', 1);
      },
      (reason) => {
        this.context.metrics.increment('stop.failed', 1);
        throw reason;
      },
    );
  }

  /**
   * Send a `workspace/didChangeConfiguration` notification to the language server.
   * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification.
   */
  public async sendDidChangeConfigurationNotification(param: InitializationOptions): Promise<void> {
    await this.lspClient?.sendNotification(DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD, {
      settings: param,
    });
  }

  /**
   * Send a `sorbet/readFile` request to the language server.
   * See https://sorbet.org/docs/lsp#sorbetreadfile-request.
   */
  public async sendReadFileRequest(
    param: vslc.TextDocumentIdentifier,
    token?: vscode.CancellationToken,
  ): Promise<vslc.TextDocumentItem | undefined> {
    const content = await this.lspClient?.sendRequest<vslc.TextDocumentItem>(
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
    param: vslc.TextDocumentPositionParams,
    token?: vscode.CancellationToken,
  ): Promise<vslc.SymbolInformation | undefined> {
    const symbolInfo = await this.lspClient?.sendRequest<vslc.SymbolInformation>(
      SHOW_SYMBOL_REQUEST_METHOD,
      param,
      token,
    );
    return symbolInfo ?? undefined;
  }
}
