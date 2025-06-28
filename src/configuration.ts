import { Disposable, Event, EventEmitter, FileSystemWatcher, workspace } from 'vscode';
import * as cfg from './common/configuration';
import { HighlightType } from './lsp/highlightType';

export interface LspOptionsChangeEvent {
  readonly name: 'highlightUntyped' | 'restartFilePatterns' | 'typedFalseCompletionNudges';
}

export interface LspConfigurationChangeEvent {
  /**
   * Current configuration. Same as current {@link Configuration.lspConfig} value.
   */
  readonly config?: LspConfig;
  /**
   * Previous configuration.
   */
  readonly previousConfig?: LspConfig;
}

export interface LspConfig {
  command: readonly string[];
  env?: Record<string, string | undefined>;
  type: LspConfigType;
}

export enum LspConfigType {
  Beta = 'beta',
  Custom = 'custom',
  Disabled = 'disabled',
  Experimental = 'experimental',
  Stable = 'stable',
}

export class Configuration implements Disposable {
  private _lspConfig: LspConfig | undefined;
  private readonly disposables: Disposable[];
  private readonly onLspConfigChangeEmitter: EventEmitter<LspConfigurationChangeEvent>;
  private readonly onLspOptionsChangeEmitter: EventEmitter<LspOptionsChangeEvent>;
  private restartFileWatchers: FileSystemWatcher[];

  constructor() {
    this._lspConfig = this.getLspConfigFromSettings();
    this.onLspConfigChangeEmitter = new EventEmitter();
    this.onLspOptionsChangeEmitter = new EventEmitter();
    this.restartFileWatchers = this.createFileWatchers();

    this.disposables = [
      this.onLspConfigChangeEmitter,
      {
        dispose: () => Disposable.from(...this.restartFileWatchers).dispose(),
      },
      workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('sorbetto.sorbetLspConfiguration')) {
          this.onConfigurationChanged();
        } else if (event.affectsConfiguration('sorbetto.sorbetLspConfigurationAdditionalArguments')) {
          if (this._lspConfig?.type !== LspConfigType.Custom) {
            this.onConfigurationChanged();
          }
        } else if (event.affectsConfiguration('sorbetto.sorbetLspCustomConfiguration')) {
          if (this._lspConfig?.type === LspConfigType.Custom) {
            this.onConfigurationChanged();
          }
        } else if (event.affectsConfiguration('sorbetto.highlightUntyped')) {
          this.onLspOptionsChangeEmitter.fire({ name: 'highlightUntyped' });
        } else if (event.affectsConfiguration('sorbetto.restartFilePatterns')) {
          Disposable.from(...this.restartFileWatchers).dispose();
          this.restartFileWatchers = this.createFileWatchers();
          this.onLspOptionsChangeEmitter.fire({ name: 'restartFilePatterns' });
        } else if (event.affectsConfiguration('sorbetto.typedFalseCompletionNudges')) {
          this.onLspOptionsChangeEmitter.fire({ name: 'typedFalseCompletionNudges' });
        }
      }),
    ];
  }

  private onConfigurationChanged() {
    const previousConfig = this._lspConfig;
    const newLspConfig = this.getLspConfigFromSettings();
    this._lspConfig = newLspConfig;
    this.onLspConfigChangeEmitter.fire({ config: this._lspConfig, previousConfig });
  }

  public dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  private getLspConfigFromSettings(defaultValue = LspConfigType.Stable): LspConfig | undefined {
    const extensionConfig = cfg.getConfiguration();
    const lspConfigType = cfg.getValue('sorbetLspConfiguration', defaultValue, extensionConfig);
    const additionalArguments = cfg.getValue('sorbetLspConfigurationAdditionalArguments', [], extensionConfig);
    const baseConfig = ['bundle', 'exec', 'srb', 'typecheck', '--lsp', ...additionalArguments];
    switch (lspConfigType) {
      case LspConfigType.Beta:
        return {
          type: LspConfigType.Beta,
          command: baseConfig.concat(['--enable-all-beta-lsp-features']),
        };
      case LspConfigType.Custom:
        return {
          type: LspConfigType.Custom,
          command: cfg.getValue('sorbetLspCustomConfiguration', [], extensionConfig),
        };
      case LspConfigType.Experimental:
        return {
          type: LspConfigType.Experimental,
          command: baseConfig.concat(['--enable-all-experimental-lsp-features']),
        };
      case LspConfigType.Stable:
        return {
          type: LspConfigType.Stable,
          command: baseConfig,
        };
      case LspConfigType.Disabled:
      default:
        return undefined;
    }
  }

  public get highlightUntyped(): HighlightType {
    return cfg.getValue('highlightUntyped', HighlightType.Disabled);
  }

  /**
   * Get the current LSP configuration.
   */
  public get lspConfig(): LspConfig | undefined {
    return this._lspConfig;
  }

  /**
   * Event that is fired when the LSP configuration changes.
   */
  public get onDidChangeLspConfig(): Event<LspConfigurationChangeEvent> {
    return this.onLspConfigChangeEmitter.event;
  }

  /**
   * Event that is fired when the LSP options change.
   */
  public get onDidChangeLspOptions(): Event<LspOptionsChangeEvent> {
    return this.onLspOptionsChangeEmitter.event;
  }

  private createFileWatchers(): FileSystemWatcher[] {
    const configFilePatterns = cfg.getValue('restartFilePatterns', []);
    return configFilePatterns.map((pattern) => {
      const watcher = workspace.createFileSystemWatcher(pattern);
      const onConfigChange = () => this.onLspOptionsChangeEmitter.fire({ name: 'restartFilePatterns' });
      watcher.onDidChange(onConfigChange);
      watcher.onDidCreate(onConfigChange);
      watcher.onDidDelete(onConfigChange);
      return watcher;
    });
  }

  public get typedFalseCompletionNudges(): boolean {
    return cfg.getValue('typedFalseCompletionNudges', true);
  }
}