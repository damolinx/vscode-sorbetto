import * as vscode from 'vscode';
import { basename } from 'path';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getTargetEditorUri } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function runRubyFile(
  context: ExtensionContext,
  pathOrUri?: string | vscode.Uri,
): Promise<void> {
  const uri = getTargetEditorUri(pathOrUri);
  if (!uri) {
    context.log.info('RunRuby: No file to run.');
    return;
  }

  if (uri.scheme !== 'file') {
    context.log.info('RunRuby: File must be saved locally to be run.', uri.toString(true));
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  if (document.isDirty) {
    context.log.info(
      'RunRuby: Saving file before running.',
      vscode.workspace.asRelativePath(document.uri),
    );
    await document.save();
  }

  if (await verifyEnvironment(context, ['ruby', 'bundle'])) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const targetPath = vscode.workspace.asRelativePath(uri, false);
    await executeCommandsInTerminal({
      commands: [`bundle exec ruby ${targetPath}`],
      cwd: workspaceFolder?.uri,
      name: `Run ${basename(targetPath)}`,
    });
  }
}
