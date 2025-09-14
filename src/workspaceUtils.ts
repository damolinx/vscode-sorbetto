import * as vscode from 'vscode';

export async function anySorbetWorkspace(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const results = await Promise.all(workspaceFolders.map(isSorbetWorkspace));
  return results.some(Boolean);
}

export async function getSorbetWorkspaceFolders(): Promise<vscode.WorkspaceFolder[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const results = await Promise.all(workspaceFolders.map(isSorbetWorkspace));
  return workspaceFolders.filter((_, i) => results[i]);
}

export async function isSorbetWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
  const result = await vscode.workspace.fs
    .stat(vscode.Uri.joinPath(workspaceFolder.uri, 'sorbet/'))
    .then(
      () => true,
      () => false,
    );
  return result;
}
