import * as vscode from 'vscode';
import { Log } from './common/log';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetLanguageClient } from './sorbetLanguageClient';
import { RestartReason, ServerStatus } from './types';

const MIN_TIME_BETWEEN_RETRIES_MS = 7000;

export class SorbetClientManager implements vscode.Disposable {
  private _sorbetClient?: SorbetLanguageClient;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onClientChangedEmitter: vscode.EventEmitter<SorbetLanguageClient | undefined>;
  private restartWatchers?: vscode.FileSystemWatcher[];

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.disposables = [
      this.onClientChangedEmitter = new vscode.EventEmitter(),
      this.context.configuration.onDidChangeLspConfig(() => this.handleLspConfigurationChanged()),
      this.context.configuration.onDidChangeLspOptions((option) => this.handleLspOptionChanged(option)),
      { dispose: () => this.sorbetClient?.dispose() },
      { dispose: () => this.disposeFileWatchers() },
    ];
  }

  dispose() {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private disposeFileWatchers() {
    if (this.restartWatchers) {
      vscode.Disposable.from(...this.restartWatchers).dispose();
      this.context.log.trace('Disposed restart FS watchers', this.restartWatchers.length);
      this.restartWatchers = undefined;
    }
  }

  private async handleLspConfigurationChanged(): Promise<void> {
    if (this.context.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
      await this.restartSorbet(RestartReason.CONFIG_CHANGE);
    } else {
      await this.stopSorbet(ServerStatus.DISABLED);
    }
  }

  private async handleLspOptionChanged(option: string): Promise<void> {
    switch (option) {
      case 'highlightUntypedCode':
        await this.context.clientManager.sorbetClient?.sendDidChangeConfigurationNotification(
          { settings: { highlightUntyped: this.context.configuration.highlightUntypedCode } });
        break;
      case 'restartFilePatterns':
        this.startFileWatchers(true);
        break;
      default:
        await this.restartSorbet(RestartReason.CONFIG_CHANGE);
        break;
    }
  }

  /**
  * Event raised on a {@link sorbetClient} change.
  */
  public get onClientChanged(): vscode.Event<SorbetLanguageClient | undefined> {
    return this.onClientChangedEmitter.event;
  }

  /**
   * Current client, if any.
   */
  public get sorbetClient(): SorbetLanguageClient | undefined {
    return this._sorbetClient;
  }

  /**
   * Set current client and fires {@link onClientChanged}.
   */
  private set sorbetClient(value: SorbetLanguageClient | undefined) {
    if (this._sorbetClient !== value) {
      this._sorbetClient = value;
      this.onClientChangedEmitter.fire(value);
    }
  }

  private startFileWatchers(force = false): void {
    if (this.restartWatchers && !force) {
      return;
    }
    this.disposeFileWatchers();
    const onChangeListener = () => this.restartSorbet(RestartReason.TRIGGER_FILES);
    this.restartWatchers = this.context.configuration.restartFilePatterns
      .map((pattern) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidChange(onChangeListener);
        watcher.onDidCreate(onChangeListener);
        watcher.onDidDelete(onChangeListener);
        return watcher;
      });
    this.context.log.trace('Created restart FS watchers', this.restartWatchers.length);
  }

  public async restartSorbet(reason: RestartReason): Promise<void> {
    this.context.metrics.increment('restart', 1, { reason });
    await this.stopSorbet(ServerStatus.RESTARTING);
    await this.startSorbet();
  }

  /**
   * Start Sorbet.
   */
  public async startSorbet(): Promise<void> {
    //TODO: figure out if config is needed
    if (this.context.configuration.lspDisabled) {
      this.context.log.warn('Ignored start request, disabled by configuration.');
      return;
    }
    if (this.sorbetClient) {
      this.context.log.debug('Ignored start request, already running.');
      return;
    }

    await withLock(this, async () => {
      let retry = false;
      let previousAttempt = 0;

      do {
        await throttle(previousAttempt, this.context.log);
        previousAttempt = Date.now();

        const client = new SorbetLanguageClient(this.context);
        this.sorbetClient = client;

        await client.start().catch((reason) => {
          retry = client.lastError?.code !== 'ENOENT';
          if (!retry) {
            this.context.log.error('Failed to start Sorbet with non-recoverable error', client.lastError?.code, reason);
          }
        });
      } while (retry);

      this.startFileWatchers();
    });

    async function withLock(context: any, task: () => Promise<void>): Promise<void> {
      if (!context['__startLock']) {
        context['__startLock'] = true;
        try {
          await task();
        }
        finally {
          delete context['__startLock'];
        }
      }
    }

    async function throttle(previous: number, log: Log): Promise<void> {
      const sleepMS = MIN_TIME_BETWEEN_RETRIES_MS - (Date.now() - previous);
      if (sleepMS > 0) {
        log.debug('Start throttled (ms):', sleepMS.toFixed(0));
        await new Promise((res) => setTimeout(res, sleepMS));
      }
    }
  }

  /**
   * Stop Sorbet.
   */
  public async stopSorbet(status: ServerStatus = ServerStatus.DISABLED): Promise<void> {
    if (!this.sorbetClient) {
      this.context.log.debug('Ignored stop request, not running.');
      return;
    }
    this.sorbetClient.dispose();
    this.sorbetClient = undefined;
    if (status !== ServerStatus.RESTARTING) {
      this.disposeFileWatchers();
    }
  }
}