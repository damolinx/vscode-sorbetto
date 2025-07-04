import * as vscode from 'vscode';
import { Log } from './common/log';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { E_COMMAND_NOT_FOUND } from './processUtils';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetLanguageClient } from './sorbetLanguageClient';
import { RestartReason, ServerStatus } from './types';

const MIN_TIME_BETWEEN_RETRIES_MS = 7000;

export class SorbetClientManager implements vscode.Disposable {

  private readonly clients: Map<string, SorbetLanguageClient>;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onClientChangedEmitter: vscode.EventEmitter<SorbetLanguageClient | undefined>;
  private restartWatchers?: vscode.FileSystemWatcher[];

  constructor(context: SorbetExtensionContext) {
    this.clients = new Map();
    this.context = context;
    this.onClientChangedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onClientChangedEmitter,
      this.context.configuration.onDidChangeLspConfig(
        () => this.handleLspConfigurationChanged()),
      this.context.configuration.onDidChangeLspOptions(
        (option) => this.handleLspOptionChanged(option)),
      {
        dispose: () => {
          this.disposeFileWatchers();
        },
      },
      {
        dispose: () => {
          vscode.Disposable.from(...this.clients.values());
          this.clients.clear();
        },
      },
    ];
    // TODO: vscode.workspace.onDidChangeWorkspaceFolders;
  }

  dispose(): void {
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
        await Promise.all([...this.clients.values()]
          .map((client) => client.sendDidChangeConfigurationNotification(
            { settings: { highlightUntyped: this.context.configuration.highlightUntypedCode } }),
          ));
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
   * Client associated with `contextFolder`.
   */
  public getClient(folderOrUri: vscode.WorkspaceFolder | vscode.Uri): SorbetLanguageClient | undefined {
    return this.clients.get(
      (folderOrUri instanceof vscode.Uri ? folderOrUri : folderOrUri.uri).toString());
  }

  private startFileWatchers(force = false): void {
    if (this.restartWatchers) {
      if (!force) {
        return;
      }
      this.disposeFileWatchers();
    }

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

  public async restartSorbet(reason: RestartReason, ...workspaceFolders: vscode.WorkspaceFolder[]): Promise<void> {
    this.context.metrics.increment('restart', workspaceFolders.length, { reason });
    await Promise.all(workspaceFolders.map(async (workspaceFolder) => {
      await this.stopSorbet(ServerStatus.RESTARTING, workspaceFolder);
      await this.startSorbet(workspaceFolder);
    }));
  }

  /**
   * Start Sorbet.
   */
  public async startSorbet(...workspaceFolders: vscode.WorkspaceFolder[]): Promise<void> {
    //TODO: figure out if config is needed
    if (this.context.configuration.lspDisabled) {
      this.context.log.warn('Ignored start request, disabled by configuration.');
      return;
    }

    const startPromises = workspaceFolders
      .filter(({ uri }) => !this.clients.has(uri.toString()))
      .map((workspaceFolder) => withLock(
        this,
        workspaceFolder.uri.fsPath,
        async () => {
          let retry = false;
          let previousAttempt = 0;

          do {
            await throttle(previousAttempt, this.context.log);
            previousAttempt = Date.now();

            const client = new SorbetLanguageClient(this.context, workspaceFolder);
            this.clients.set(client.workspaceFolder.uri.toString(), client);
            this.onClientChangedEmitter.fire(client);

            try {
              await client.start();
              this.startFileWatchers(); // TODO
            } catch {
              const errorInfo = await client.sorbetProcess!.exit;
              if (errorInfo?.code === 'ENOENT' || errorInfo?.errno === E_COMMAND_NOT_FOUND) {
                this.context.log.error('Failed to start Sorbet with non-recoverable error:', errorInfo.code || errorInfo.errno);
                retry = false;
              } else {
                retry = true;
              }
              client.dispose();
            }
          } while (retry);
        }),
      );

    await Promise.all(startPromises);

    async function withLock(manager: any, lock: string, task: () => Promise<void>): Promise<void> {
      if (!manager[lock]) {
        manager[lock] = true;
        try { await task(); }
        finally { delete manager[lock]; }
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

  public stopSorbet(status: ServerStatus = ServerStatus.DISABLED, ...workspaceFolders: vscode.WorkspaceFolder[]): void {
    for (const { uri } of workspaceFolders) {
      const client = this.clients.get(uri.toString());
      if (client) {
        this.context.log.debug('Stop client.', uri);
        client.dispose();
        this.clients.delete(uri.toString());
      } else {
        this.context.log.trace('Stop client ignored, not running.', uri);
      }
    }

    // TODO:
    if (status !== ServerStatus.RESTARTING) {
      this.disposeFileWatchers();
    }
  }
}