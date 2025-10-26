import * as vscode from 'vscode';
import { Configuration } from './common/configuration';
import { Log } from './common/log';
import { LogMetrics, Metrics } from './common/metrics';
import { SorbetClientManager } from './lspClient/sorbetClientManager';

export class ExtensionContext {
  public readonly clientManager: SorbetClientManager;
  public readonly configuration: Configuration;
  public readonly extensionContext: vscode.ExtensionContext;
  public readonly logOutputChannel: vscode.LogOutputChannel;
  public readonly metrics: Metrics;

  constructor(context: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.logOutputChannel = vscode.window.createOutputChannel('Sorbetto', { log: true });
    this.metrics = new LogMetrics(this.logOutputChannel);

    this.clientManager = new SorbetClientManager(this);

    this.disposables.push(this.clientManager, this.configuration, this.logOutputChannel);
  }

  /**
   * An array to which disposables can be added. When this
   * extension is deactivated the disposables will be disposed.
   *
   * *Note* that asynchronous dispose-functions aren't awaited.
   */
  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }

  /**
   * Logger.
   */
  public get log(): Log {
    return this.logOutputChannel;
  }
}
