// import * as vscode from 'vscode';
// import { Log } from './common/log';
// import { E_COMMAND_NOT_FOUND, ErrorInfo } from './common/processUtils';
// import { buildLspConfiguration } from './configuration/lspConfiguration';
// import { LspConfigurationType } from './configuration/lspConfigurationType';
// import { SorbetClient } from './sorbetClient';
// import { SorbetExtensionContext } from './sorbetExtensionContext';
// import { RestartReason, LspStatus } from './types';

// const LEGACY_RETRY_EXITCODE = 11;
// const MAX_RETRIES = 38; // About 15min, base 10s and cap 60s
// const THROTTLE_CONFIG = {
//   baseDelayMs: 10000,
//   attemptsPerTier: 12,
//   maxDelayMs: 60000,
// } as const;

// export class SorbetClientManager implements vscode.Disposable {
//   private readonly clients: Map<string, SorbetClient>;
//   private readonly context: SorbetExtensionContext;
//   private readonly disposables: vscode.Disposable[];
//   private readonly onClientAddedEmitter: vscode.EventEmitter<SorbetClient | undefined>;
//   private readonly onClientRemovedEmitter: vscode.EventEmitter<SorbetClient | undefined>;
//   private restartWatchers?: vscode.FileSystemWatcher[];

//   constructor(context: SorbetExtensionContext) {
//     this.clients = new Map<string, SorbetClient>();
//     this.context = context;
//     this.onClientAddedEmitter = new vscode.EventEmitter();
//     this.onClientRemovedEmitter = new vscode.EventEmitter();

//     this.disposables = [
//       this.onClientAddedEmitter,
//       this.onClientRemovedEmitter,
//       this.context.configuration.onDidChangeLspConfig(() => this.handleLspConfigurationChanged()),
//       this.context.configuration.onDidChangeLspOptions((option) =>
//         this.handleLspOptionChanged(option),
//       ),
//       { dispose: () => this.disposeFileWatchers() },
//     ];
//   }

//   dispose(): void {
//     vscode.Disposable.from(...this.disposables).dispose();
//     vscode.Disposable.from(...this.clients.values()).dispose();
//     this.clients.clear();
//   }

//   private disposeFileWatchers() {
//     if (this.restartWatchers) {
//       vscode.Disposable.from(...this.restartWatchers).dispose();
//       this.context.log.trace('Disposed restart FS watchers', this.restartWatchers.length);
//       this.restartWatchers = undefined;
//     }
//   }

//   private addSorbetClient(client: SorbetClient): boolean {
//     if (this.clients.has(client.workspaceFolder.uri.toString())) {
//       return false;
//     }
//     this.clients.set(client.workspaceFolder.uri.toString(), client);
//     this.onClientAddedEmitter.fire(client);
//     return true;
//   }

//   private removeSorbetClient(uri: vscode.Uri): boolean {
//     const client = this.clients.get(uri.toString());
//     if (client && this.clients.delete(uri.toString())) {
//       this.onClientRemovedEmitter.fire(client);
//       client.dispose();
//       return true;
//     }
//     return false;
//   }

//   /**
//    * Get the Sorbet client associated with the workspace folder that contains the given {@link uri}.
//    * @param uri A context URI.
//    * @returns Associated Sorbet client or `undefined`.
//    */
//   public getSorbetClient(uri: vscode.Uri): SorbetClient | undefined {
//     const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
//     return workspaceFolder && this.clients.get(workspaceFolder.uri.toString());
//   }

//   /**
//    * All active Sorbet clients.
//    */
//   public getSorbetClients(): SorbetClient[] {
//     return [...this.clients.values()];
//   }

//   private async handleLspConfigurationChanged(): Promise<void> {
//     if (this.context.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
//       await this.restartSorbet(RestartReason.CONFIG_CHANGE);
//     } else {
//       await this.stopSorbet(LspStatus.Disabled);
//     }
//   }

//   private async handleLspOptionChanged(option: string): Promise<void> {
//     switch (option) {
//       case 'highlightUntypedCode':
//         await this.sorbetClient?.sendDidChangeConfigurationNotification({
//           highlightUntyped: this.context.configuration.highlightUntypedCode,
//         });
//         break;
//       case 'restartFilePatterns':
//         this.startFileWatchers(true);
//         break;
//       default:
//         await this.restartSorbet(RestartReason.CONFIG_CHANGE);
//         break;
//     }
//   }

//   /**
//    * Event raised on a {@link sorbetClient} change.
//    */
//   public get onClientChanged(): vscode.Event<SorbetClient | undefined> {
//     return this.onClientChangedEmitter.event;
//   }

//   private startFileWatchers(force = false): void {
//     if (this.restartWatchers && !force) {
//       return;
//     }
//     this.disposeFileWatchers();
//     const onChangeListener = () => this.restartSorbet(RestartReason.TRIGGER_FILES);
//     this.restartWatchers = this.context.configuration.restartFilePatterns.map((pattern) => {
//       const watcher = vscode.workspace.createFileSystemWatcher(pattern);
//       watcher.onDidChange(onChangeListener);
//       watcher.onDidCreate(onChangeListener);
//       watcher.onDidDelete(onChangeListener);
//       return watcher;
//     });
//     this.context.log.trace('Created restart FS watchers', this.restartWatchers!.length);
//   }

//   public async restartSorbet(reason: RestartReason): Promise<void> {
//     this.context.metrics.increment('restart', 1, { reason });
//     await this.stopSorbet(LspStatus.Restarting);
//     await this.startSorbet();
//   }

//   /**
//    * Start Sorbet.
//    */
//   public async startSorbet(): Promise<void> {
//     if (this.sorbetClient) {
//       this.context.log.debug('Ignored start request, already running.');
//       return;
//     }

//     const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);
//     if (!workspaceFolder) {
//       throw new Error('Missing target workspace folder');
//     }

//     const configuration = await buildLspConfiguration(this.context.configuration);
//     if (!configuration) {
//       throw new Error('Missing target configuration');
//     }

//     await withLock(this, async () => {
//       let retryTimestamp = 0;
//       let retry = false;
//       let retryAttempt = 0;

//       do {
//         retryTimestamp = await throttle(retryAttempt, retryTimestamp, this.context.log);
//         this.context.log.debug('Start attempt —', 1 + retryAttempt, 'of', MAX_RETRIES);
//         const client = new SorbetClient(this.context, workspaceFolder, configuration);

//         try {
//           const {
//             process: { exitCode },
//           } = await client.start();
//           if (typeof exitCode === 'number') {
//             if (exitCode === LEGACY_RETRY_EXITCODE) {
//               this.context.log.warn(
//                 'Sorbet LSP exited after startup with known retry exit code:',
//                 exitCode,
//               );
//               retry = true;
//             } else {
//               this.context.log.error(
//                 'Sorbet LSP exited after startup. Check configuration:',
//                 this.context.configuration.lspConfigurationType,
//               );
//               retry = false;
//             }
//             client.status = LspStatus.Error;
//             client.dispose();
//           } else {
//             this.sorbetClient = client;
//             this.startFileWatchers();
//             retry = false;
//           }
//         } catch (err) {
//           const errorInfo = await client.lspProcess?.exit;
//           if (errorInfo && isUnrecoverable(errorInfo)) {
//             this.context.log.error(
//               'Sorbet LSP failed to start with unrecoverable error.',
//               errorInfo.code || errorInfo.errno,
//             );
//             retry = false;
//           } else {
//             this.context.log.error(
//               'Sorbet LSP failed to start but will retry.',
//               (errorInfo && (errorInfo.code || errorInfo.errno)) || err,
//             );
//             retry = true;
//           }
//           client.dispose();
//         }
//       } while (retry && ++retryAttempt < MAX_RETRIES);
//     });

//     function isUnrecoverable(errorInfo: ErrorInfo): boolean {
//       return (
//         errorInfo &&
//         ((errorInfo.code !== undefined && ['EACCES', 'ENOENT'].includes(errorInfo.code)) ||
//           errorInfo.errno === E_COMMAND_NOT_FOUND)
//       );
//     }

//     async function throttle(
//       attempt: number,
//       previous: number,
//       log: Log,
//       opts = THROTTLE_CONFIG,
//     ): Promise<number> {
//       if (attempt > 0) {
//         const delay = Math.min(
//           opts.maxDelayMs,
//           opts.baseDelayMs * Math.pow(2, Math.floor(attempt / opts.attemptsPerTier)),
//         );
//         const sleepMS = delay - (Date.now() - previous);
//         if (sleepMS > 0) {
//           log.debug('Start throttled —', sleepMS, 'ms');
//           await new Promise((res) => setTimeout(res, sleepMS));
//         }
//       }

//       return Date.now();
//     }

//     async function withLock(context: any, task: () => Promise<void>): Promise<void> {
//       if (!context['__startLock']) {
//         context['__startLock'] = true;
//         try {
//           await task();
//         } finally {
//           delete context['__startLock'];
//         }
//       }
//     }
//   }

//   /**
//    * Stop Sorbet.
//    */
//   public async stopSorbet(uri: vscode.Uri, status: LspStatus = LspStatus.Disabled): Promise<void> {
//     if (!this.removeSorbetClient(uri)) {
//       this.context.log.debug('Ignored stop request, not running.');
//       return;
//     }
//     if (status !== LspStatus.Restarting) {
//       this.disposeFileWatchers();
//     }
//   }
// }
