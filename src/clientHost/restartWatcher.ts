import * as vscode from 'vscode';
import { Log } from '../common/log';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClientHost } from './sorbetClientHost';

export class RestartWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private fsWatchers?: vscode.FileSystemWatcher[];

  constructor(
    private readonly clientHost: SorbetClientHost,
    private readonly log: Log,
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

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.disable();
  }

  private disable(): void {
    if (this.fsWatchers) {
      vscode.Disposable.from(...this.fsWatchers).dispose();
      this.fsWatchers = undefined;
    }
  }

  private enable(): void {
    if (this.fsWatchers) {
      this.log.debug(
        'Ignored restart-watcher creation request, already exists',
        this.fsWatchers.length,
        this.clientHost.workspaceFolder.uri.toString(true),
      );
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
    this.log.debug(
      'Created restart FS watchers',
      this.clientHost.workspaceFolder.uri.toString(true),
    );
  }
}
