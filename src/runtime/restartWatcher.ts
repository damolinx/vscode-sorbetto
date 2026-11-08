import * as vscode from 'vscode';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClientHost } from './host/sorbetClientHost';
import { WorkspaceScopedOutputChannel } from './workspaceScopedOutputChannel';

export class RestartWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private fsWatchers?: vscode.FileSystemWatcher[];

  constructor(
    private readonly clientHost: SorbetClientHost,
    private readonly log: WorkspaceScopedOutputChannel,
  ) {
    this.disposables = [
      this.clientHost.configuration.onDidChangeLspConfig(() => {
        if (this.clientHost.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
          this.enable();
        } else {
          this.disable();
        }
      }),
      this.clientHost.configuration.onDidChangeLspOptions((option) => {
        if (option === 'restartFilePatterns') {
          this.disable();
          this.enable();
        }
      }),
    ];

    if (this.clientHost.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
      this.enable();
    }
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.disable();
  }

  private disable(): void {
    if (this.fsWatchers) {
      for (const watcher of this.fsWatchers) {
        watcher.dispose();
      }
      this.fsWatchers = undefined;
    }
  }

  private enable(): void {
    if (this.fsWatchers) {
      this.log.debug('Create restart-watcher request ignored; already exists');
      return;
    }

    const onChangeListener = () => this.clientHost.restart();
    this.fsWatchers = this.clientHost.configuration.restartFilePatterns.map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(onChangeListener);
      watcher.onDidCreate(onChangeListener);
      watcher.onDidDelete(onChangeListener);
      return watcher;
    });
    this.log.debug('Created restart-watchers');
  }
}
