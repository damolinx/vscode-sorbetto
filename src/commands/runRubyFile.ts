import * as vscode from 'vscode';
import { basename } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal } from './utils';

export function runRubyFile(context: SorbetExtensionContext, pathOrUri?: string | vscode.Uri) {
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.file(pathOrUri)
    : vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    context.log.info('No file to run. Open a Ruby file or provide a path.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const targetPath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;

  return executeCommandsInTerminal({
    commands: [`bundle exec ruby ${targetPath}`],
    cwd: workspaceFolder?.uri.fsPath,
    name: `Run ${basename(targetPath)}`,
  });
}
