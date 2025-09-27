import * as vscode from 'vscode';

export class WorkspaceFolderOutputChannel implements vscode.OutputChannel {
  private readonly outputChannel: vscode.OutputChannel;
  private readonly workspaceName: string;

  constructor(outputChannel: vscode.OutputChannel, workspaceFolder: vscode.WorkspaceFolder) {
    this.outputChannel = outputChannel;
    this.workspaceName = `[${workspaceFolder.name}]`;
  }

  dispose(): void {}

  append(value: string): void {
    this.outputChannel.append(this.normalizeValue(value));
  }

  appendLine(value: string): void {
    this.outputChannel.appendLine(this.normalizeValue(value));
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

  private normalizeValue(value: string) {
    const single = vscode.workspace.workspaceFolders?.length === 1;
    const normalizedValue = value.trim();
    return single ? normalizedValue : `${this.workspaceName} ${normalizedValue}`;
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
