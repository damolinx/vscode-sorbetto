import * as vscode from 'vscode';
import { EXTENSION_PREFIX } from '../constants';

export class Configuration implements vscode.Disposable {
  protected readonly disposables: vscode.Disposable[];

  constructor() {
    this.disposables = [];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  protected get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
  }

  /**
   * Return a value from {@link EXTENSION_PREFIX} configuration.
   */
  public getValue<T>(section: string): T | undefined;
  public getValue<T>(section: string, defaultValue: T): T;
  public getValue<T>(section: string, defaultValue?: T): T | undefined {
    return this.configuration.get(section, defaultValue);
  }
}
