import * as vscode from 'vscode';

export async function anySorbetWorkspace(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  for (const workspaceFolder of workspaceFolders) {
    if (await isSorbetWorkspace(workspaceFolder)) {
      return true;
    }
  }
  return false;
}

export async function getSorbetWorkspaceFolders(): Promise<vscode.WorkspaceFolder[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const sorbetWorkspaceFolders = [];
  for (const workspaceFolder of workspaceFolders) {
    if (await isSorbetWorkspace(workspaceFolder)) {
      sorbetWorkspaceFolders.push(workspaceFolder);
    }
  }
  return sorbetWorkspaceFolders;
}

export async function isSorbetWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
  const result = await vscode.workspace.fs.stat(
    vscode.Uri.joinPath(workspaceFolder.uri, 'sorbet/config'))
    .then(() => true, () => false);
  return result;
}
