import * as vscode from 'vscode';

export class WorkspaceFolderOutputChannel implements vscode.LogOutputChannel {
  public static normalizedLogValue(
    value: string,
    workspaceName: string,
    forceSingleLine?: true,
  ): string {
    const single = vscode.workspace.workspaceFolders?.length === 1;
    let normalizedValue = value.trim();
    if (forceSingleLine) {
      normalizedValue = normalizedValue.replaceAll(/\.?\s*\n/g, '. ');
    }
    return single ? normalizedValue : `${workspaceName} ${normalizedValue}`;
  }

  private readonly channel: vscode.LogOutputChannel;
  private readonly workspaceName: string;

  constructor(channel: vscode.LogOutputChannel, { name }: vscode.WorkspaceFolder) {
    this.channel = channel;
    this.workspaceName = `[${name}]`;
  }

  dispose(): void {}

  public get logLevel(): vscode.LogLevel {
    return this.channel.logLevel;
  }

  public append(value: string): void {
    this.channel.append(
      WorkspaceFolderOutputChannel.normalizedLogValue(value, this.workspaceName, true),
    );
  }

  public appendLine(value: string): void {
    this.channel.appendLine(
      WorkspaceFolderOutputChannel.normalizedLogValue(value, this.workspaceName),
    );
  }

  public clear(): void {
    this.channel.clear();
  }

  public debug(message: string, ...args: any[]): void {
    this.channel.debug(message, ...args);
  }

  public error(error: string | Error, ...args: any[]): void {
    this.channel.error(error, ...args);
  }

  public hide(): void {
    this.channel.hide();
  }

  public info(message: string, ...args: any[]): void {
    this.channel.info(message, ...args);
  }

  public get name(): string {
    return this.channel.name;
  }

  public get onDidChangeLogLevel(): vscode.Event<vscode.LogLevel> {
    return this.channel.onDidChangeLogLevel;
  }

  public replace(value: string): void {
    this.channel.replace(value);
  }

  public show(preserveFocus?: boolean): void;
  public show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  public show(columnOrPreserveFocus?: boolean | vscode.ViewColumn, preserveFocus?: boolean): void {
    this.channel.show(
      typeof columnOrPreserveFocus === 'boolean' ? columnOrPreserveFocus : preserveFocus,
    );
  }

  public trace(message: string, ...args: any[]): void {
    this.channel.trace(message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.channel.warn(message, ...args);
  }
}
