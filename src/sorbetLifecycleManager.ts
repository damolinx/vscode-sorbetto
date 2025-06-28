import * as vscode from 'vscode';
import { Configuration } from './configuration/configuration';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { NOTIFICATION_METHOD } from './lsp/workspaceDidChangeConfigurationNotification';
import { SorbetStatusProvider } from './sorbetStatusProvider';
import { RestartReason, ServerStatus } from './types';

export class SorbetLifecycleManager implements vscode.Disposable {
  private readonly configuration: Configuration;
  private readonly disposables: vscode.Disposable[];
  private restartWatchers: vscode.FileSystemWatcher[];
  private readonly statusProvider: SorbetStatusProvider;

  constructor(configuration: Configuration, statusProvider: SorbetStatusProvider) {
    this.configuration = configuration;
    this.restartWatchers = [];
    this.statusProvider = statusProvider;

    this.refreshFileWatchers();

    this.disposables = [
      configuration.onDidChangeLspConfig(() => this.handleLspConfigChanged()),
      configuration.onDidChangeLspOptions((option) => this.handleLspOptionChanged(option)),
      {
        dispose: () => vscode.Disposable.from(...this.restartWatchers).dispose(),
      },
    ];
  }

  dispose() {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private async handleLspConfigChanged(): Promise<void> {
    if (this.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
      await this.statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
    } else {
      await this.statusProvider.stopSorbet(ServerStatus.DISABLED);
    }
  }

  private async handleLspOptionChanged(option: string): Promise<void> {
    switch (option) {
      case 'highlightUntypedCode':
        await this.statusProvider.activeLanguageClient?.sendNotification(
          NOTIFICATION_METHOD,
          { settings: { highlightUntyped: this.configuration.highlightUntypedCode } });
        break;
      case 'restartFilePatterns':
        // FS watchers are not supported by Sorbet LSP
        this.refreshFileWatchers();
        break;
      default:
        // typedFalseCompletionNudges, others do not support notification-based refresh
        await this.statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
        break;
    }
  }

  private refreshFileWatchers(): void {
    vscode.Disposable.from(...this.restartWatchers).dispose();
    const onChangeListener = () => this.statusProvider.restartSorbet(RestartReason.TRIGGER_FILES);
    this.restartWatchers = this.configuration.restartFilePatterns.map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(onChangeListener);
      watcher.onDidCreate(onChangeListener);
      watcher.onDidDelete(onChangeListener);
      return watcher;
    });
  }
}