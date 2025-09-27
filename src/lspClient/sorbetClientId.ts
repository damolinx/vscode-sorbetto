import * as vscode from 'vscode';

export type SorbetClientId = string & { __clientIdBrand: never };

export function createClientId(workspaceFolder: vscode.WorkspaceFolder): SorbetClientId {
  return workspaceFolder.uri.toString() as SorbetClientId;
}
