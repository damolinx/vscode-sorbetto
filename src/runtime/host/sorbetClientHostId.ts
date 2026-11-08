import * as vscode from 'vscode';

export type SorbetClientHostId = string & { __sorbetClientHostIdBrand: never };

export function createClientHostId({ uri }: vscode.WorkspaceFolder): SorbetClientHostId {
  return uri.toString(true) as SorbetClientHostId;
}
