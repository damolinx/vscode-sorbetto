import * as vscode from 'vscode';
import { Configuration } from './common/configuration';
import { Log } from './common/log';
import { LogMetrics, Metrics } from './common/metrics';
import { SorbetClientManager } from './lspClient/sorbetClientManager';

export class SorbetExtensionContext implements vscode.Disposable {
  public readonly clientManager: SorbetClientManager;
  public readonly configuration: Configuration;
  private readonly disposables: vscode.Disposable[];
  public readonly extensionContext: vscode.ExtensionContext;
  public readonly logOutputChannel: vscode.LogOutputChannel;
  public readonly metrics: Metrics;

  constructor(context: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.logOutputChannel = vscode.window.createOutputChannel('Sorbetto', { log: true });

    this.clientManager = new SorbetClientManager(this);
    this.metrics = new LogMetrics(this.logOutputChannel);

    this.disposables = [this.configuration, this.clientManager, this.logOutputChannel];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  /**
   * Logger.
   */
  public get log(): Log {
    return this.logOutputChannel;
  }
}
