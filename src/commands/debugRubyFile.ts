import * as vscode from 'vscode';
import { basename } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function debugRubyFile(
  context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
) {
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.file(pathOrUri)
    : vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    context.log.info('No file to debug. Open a Ruby file or provide a path.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const targetPath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;

  if (await verifyEnvironment(context, 'ruby', 'bundle', 'rdbg')) {
    return executeCommandsInTerminal({
      commands: [`bundle exec rdbg ${targetPath}`],
      cwd: workspaceFolder?.uri.fsPath,
      name: `Run ${basename(targetPath)}`,
    });
  }

  return;
}
