import { Disposable, ExtensionContext, LogOutputChannel, window } from 'vscode';
import { Configuration } from './configuration';
import { Log } from './common/log';
import { LogMetrics, Metrics } from './common/metrics';
import { SorbetStatusProvider } from './sorbetStatusProvider';

export class SorbetExtensionContext implements Disposable {
  public readonly configuration: Configuration;
  private readonly disposables: Disposable[];
  public readonly extensionContext: ExtensionContext;
  public readonly metrics: Metrics;
  public readonly statusProvider: SorbetStatusProvider;
  public readonly logOutputChannel: LogOutputChannel;

  constructor(context: ExtensionContext) {
    this.configuration = new Configuration();
    this.extensionContext = context;
    this.logOutputChannel = window.createOutputChannel('Sorbetto', { log: true });
    this.metrics = new LogMetrics(this.log);
    this.statusProvider = new SorbetStatusProvider(this);

    this.disposables = [
      this.configuration,
      this.logOutputChannel,
      this.statusProvider,
    ];
  }

  public dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  /**
   * Logger.
   */
  public get log(): Log {
    return this.logOutputChannel;
  }
}
