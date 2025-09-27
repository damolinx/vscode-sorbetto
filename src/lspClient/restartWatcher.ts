import * as vscode from 'vscode';
import { Log } from '../common/log';
import { SorbetClient } from './sorbetClient';

export class RestartWatcher implements vscode.Disposable {
  private readonly client: SorbetClient;
  private fsWatchers?: vscode.FileSystemWatcher[];
  private readonly log: Log;

  constructor(client: SorbetClient, log: Log) {
    this.client = client;
    this.log = log;

    this.client.configuration.onDidChangeLspOptions((option) => {
      if (option === 'restartFilePatterns') {
        this.disable();
        this.enable();
      }
    });
  }

  dispose(): void {
    this.disable();
  }

  public disable(): void {
    if (this.fsWatchers) {
      vscode.Disposable.from(...this.fsWatchers).dispose();
      this.fsWatchers = undefined;
    }
  }

  public enable(): void {
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
