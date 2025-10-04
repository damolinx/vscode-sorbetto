import * as vscode from 'vscode';
import { basename } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal, getTargetEditorUri } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function runRubyFile(
  context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
) {
  const uri = getTargetEditorUri(pathOrUri);
  if (!uri) {
    context.log.info('RunRuby: No file to run.');
    return;
  }

  if (uri.scheme !== 'file') {
    context.log.info(
      'RunRuby: File must be saved locally to be run.',
      vscode.workspace.asRelativePath(uri),
    );
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const targetPath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;

  const document = await vscode.workspace.openTextDocument(uri);
  if (document.isDirty) {
    context.log.info(
      'RunRuby: Saving file before running.',
      vscode.workspace.asRelativePath(document.uri),
    );
    await document.save();
  }

  if (await verifyEnvironment(context, 'ruby', 'bundle')) {
    return executeCommandsInTerminal({
      commands: [`bundle exec ruby ${targetPath}`],
      cwd: workspaceFolder?.uri.fsPath,
      name: `Run ${basename(targetPath)}`,
    });
  }

  return;
}
