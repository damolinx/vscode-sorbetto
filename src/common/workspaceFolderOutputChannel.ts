import * as vscode from 'vscode';

export class WorkspaceFolderOutputChannel implements vscode.OutputChannel {
  public static normalizedLogValue(value: string, workspaceName: string, forceSingleLine?: true): string {
    const single = vscode.workspace.workspaceFolders?.length === 1;
    let normalizedValue = value.trim();
    if (forceSingleLine) {
      normalizedValue = normalizedValue.replaceAll(/\.?\s*\n/g, '. ');
    }
    return single ? normalizedValue : `${workspaceName} ${normalizedValue}`;
  }

  private readonly outputChannel: vscode.OutputChannel;
  private readonly workspaceName: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceFolder: vscode.WorkspaceFolder) {
    this.outputChannel = outputChannel;
    this.workspaceName = `[${workspaceFolder.name}]`;
  }

  dispose(): void { }

  append(value: string): void {
    this.outputChannel.append(
      WorkspaceFolderOutputChannel.normalizedLogValue(value, this.workspaceName, true),
    );
  }

  appendLine(value: string): void {
    this.outputChannel.appendLine(
      WorkspaceFolderOutputChannel.normalizedLogValue(value, this.workspaceName),
    );
  }

  clear(): void {
    this.outputChannel.clear();
  }

  hide(): void {
    this.outputChannel.hide();
  }

  get name(): string {
    return this.outputChannel.name;
  }

  replace(value: string): void {
    this.outputChannel.replace(value);
  }

  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(columnOrPreserveFocus?: boolean | vscode.ViewColumn, preserveFocus?: boolean): void {
    this.outputChannel.show(
      typeof columnOrPreserveFocus === 'boolean' ? columnOrPreserveFocus : preserveFocus,
    );
  }
}
