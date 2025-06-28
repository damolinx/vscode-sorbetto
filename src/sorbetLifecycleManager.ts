import * as vscode from 'vscode';
import { Configuration } from './configuration/configuration';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetStatusProvider } from './sorbetStatusProvider';
import { RestartReason, ServerStatus } from './types';

export class SorbetLifecycleManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private restartWatchers: vscode.FileSystemWatcher[];

  constructor(configuration: Configuration, statusProvider: SorbetStatusProvider) {
    this.restartWatchers = SorbetLifecycleManager.createFileWatchers(configuration, statusProvider);

    this.disposables = [
      configuration.onDidChangeLspConfig(
        async () => {
          if (configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
            await statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
          } else {
            await statusProvider.stopSorbet(ServerStatus.DISABLED);
          }
        },
      ),
      configuration.onDidChangeLspOptions(
        async (option) => {
          if (option === 'restartFilePatterns') {
            vscode.Disposable.from(...this.restartWatchers).dispose();
            this.restartWatchers = SorbetLifecycleManager.createFileWatchers(configuration, statusProvider);
          } else {
            await statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
          }
        }),
      {
        dispose: () => vscode.Disposable.from(...this.restartWatchers).dispose(),
      },
    ];
  }

  dispose() {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private static createFileWatchers(
    configuration: Configuration,
    statusProvider: SorbetStatusProvider):
    vscode.FileSystemWatcher[] {
    const onChangeListener = () => statusProvider.restartSorbet(RestartReason.TRIGGER_FILES);
    return configuration.restartFilePatterns.map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(onChangeListener);
      watcher.onDidCreate(onChangeListener);
      watcher.onDidDelete(onChangeListener);
      return watcher;
    });
  }
}