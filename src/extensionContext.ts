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
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.log = vscode.window.createOutputChannel('Sorbetto', { log: true });

    this.metrics = new LogMetrics(this.log);
    this.clientManager = new SorbetClientManager(this);

    this.disposables.push(this.clientManager, this.configuration, this.log);
  }

  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }
}
