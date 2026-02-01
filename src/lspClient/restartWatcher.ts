import * as vscode from 'vscode';
import { Log } from '../common/log';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SorbetClient } from './sorbetClient';

export class RestartWatcher implements vscode.Disposable {
  private readonly client: SorbetClient;
  private readonly disposables: vscode.Disposable[];
  private fsWatchers?: vscode.FileSystemWatcher[];
  private readonly log: Log;

  constructor(client: SorbetClient, log: Log) {
    this.client = client;
    this.log = log;
    this.disposables = [
      this.client.configuration.onDidChangeLspConfig(() => {
        if (this.client.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
          this.enable();
        } else {
          this.disable();
        }
      }),
      this.client.configuration.onDidChangeLspOptions((option) => {
        if (option === 'restartFilePatterns') {
          this.disable();
          this.enable();
        }
      }),
    ];

    if (this.client.configuration.lspConfigurationType !== LspConfigurationType.Disabled) {
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
        this.client.workspaceFolder.uri.toString(true),
      );
      return;
    }

    const onChangeListener = () => this.client.restart();
    this.fsWatchers = this.client.configuration.restartFilePatterns.map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(onChangeListener);
      watcher.onDidCreate(onChangeListener);
      watcher.onDidDelete(onChangeListener);
      return watcher;
    });
    this.log.debug('Created restart FS watchers', this.client.workspaceFolder.uri.toString(true));
  }
}
