import * as vscode from 'vscode';
import { SorbetClientManager } from './clientManager/sorbetClientManager';
import { Configuration } from './common/configuration';
import { Log } from './common/log';
import { LogMetrics, Metrics } from './common/metrics';

export class ExtensionContext {
  public readonly clientManager: SorbetClientManager;
  public readonly configuration: Configuration;
  public readonly extensionContext: vscode.ExtensionContext;
  public readonly log: vscode.LogOutputChannel & Log;
  public readonly metrics: Metrics;

  constructor(context: vscode.ExtensionContext) {
    const log = vscode.window.createOutputChannel('Sorbetto', { log: true });
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.log = log;
    this.metrics = new LogMetrics(log);

    this.clientManager = new SorbetClientManager(this);

    this.disposables.push(this.clientManager, this.configuration, this.log);
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
}
