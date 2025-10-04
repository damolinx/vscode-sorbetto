import * as vscode from 'vscode';
import { basename } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal, getTargetEditorUri } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function debugRubyFile(
  context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
) {
  const uri = getTargetEditorUri(pathOrUri);
  if (!uri) {
    context.log.info('DebugRuby: No target file.');
    return;
  }

  if (uri.scheme !== 'file') {
    context.log.info(
      'DebugRuby: File must be saved locally to be debugged.',
      vscode.workspace.asRelativePath(uri),
    );
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const targetPath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;

  const document = await vscode.workspace.openTextDocument(uri);
  if (document.isDirty) {
    context.log.info(
      'DebugRuby: Saving file before debugging.',
      vscode.workspace.asRelativePath(document.uri),
    );
    await document.save();
  }

  if (await verifyEnvironment(context, 'ruby', 'bundle', 'rdbg')) {
    return executeCommandsInTerminal({
      commands: [`bundle exec rdbg ${targetPath}`],
      cwd: workspaceFolder?.uri.fsPath,
      name: `Debug ${basename(targetPath)}`,
    });
  }

  return;
}
