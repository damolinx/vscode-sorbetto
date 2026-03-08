import * as vscode from 'vscode';

export async function getSorbetWorkspaceFolders(): Promise<vscode.WorkspaceFolder[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const results = await Promise.all(workspaceFolders.map(isSorbetWorkspace));
  return workspaceFolders.filter((_, i) => results[i]);
}

export function isSorbetWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
  return uriExists(vscode.Uri.joinPath(workspaceFolder.uri, 'sorbet/'), vscode.FileType.Directory);
}

export function uriEquals(a: vscode.Uri, b: vscode.Uri): boolean {
  return (
    a.scheme === b.scheme &&
    a.authority === b.authority &&
    normalizePath(a.path) === normalizePath(b.path)
  );

  function normalizePath(path: string): string {
    return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  }
}

export async function uriExists(uri: vscode.Uri, type?: vscode.FileType): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return type !== undefined ? (stat.type & type) !== 0 : true;
  } catch {
    return false;
  }
}
