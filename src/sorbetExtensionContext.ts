import * as vscode from 'vscode';
import { ClientManager } from './clientManager';
import { Log } from './common/log';
import { LogMetrics, Metrics } from './common/metrics';
import { Configuration } from './configuration/configuration';
import { SorbetStatusProvider } from './sorbetStatusProvider';

export class SorbetExtensionContext implements vscode.Disposable {
  public readonly clientManager: ClientManager;
  public readonly configuration: Configuration;
  private readonly disposables: vscode.Disposable[];
  public readonly extensionContext: vscode.ExtensionContext;
  public readonly logOutputChannel: vscode.LogOutputChannel;
  public readonly metrics: Metrics;
  public readonly statusProvider: SorbetStatusProvider;

  constructor(context: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.logOutputChannel = vscode.window.createOutputChannel('Sorbetto', { log: true });

    this.clientManager = new ClientManager(this);
    this.metrics = new LogMetrics(this.log);
    this.statusProvider = new SorbetStatusProvider(this);

    this.disposables = [
      this.configuration,
      this.clientManager,
      this.logOutputChannel,
      this.statusProvider,
    ];
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
