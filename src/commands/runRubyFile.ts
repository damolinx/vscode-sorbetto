import * as vscode from 'vscode';
import { basename } from 'path';
import { mainAreaActiveTextEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function runRubyFile(context: ExtensionContext, uri?: vscode.Uri): Promise<void> {
  const targetUri = uri ?? mainAreaActiveTextEditorUri();
  if (!targetUri) {
    context.log.info('RunRuby: No file to run.');
    return;
  }

  if (targetUri.scheme !== 'file') {
    context.log.info(
      'RunRuby: File must be saved locally to be run.',
      vscode.workspace.asRelativePath(targetUri),
    );
    return;
  }

  const document = await vscode.workspace.openTextDocument(targetUri);
  if (document.isDirty) {
    context.log.info(
      'RunRuby: Saving file before running.',
      vscode.workspace.asRelativePath(document.uri),
    );
    await document.save();
  }

  if (await verifyEnvironment(context, ['ruby', 'bundle'])) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
    const targetPath = vscode.workspace.asRelativePath(targetUri, false);
    await executeCommandsInTerminal({
      commands: [`bundle exec ruby ${targetPath}`],
      cwd: workspaceFolder?.uri,
      name: `Run ${basename(targetPath)}`,
    });
  }
}
