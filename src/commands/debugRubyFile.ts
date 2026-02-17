import * as vscode from 'vscode';
import { basename } from 'path';
import { mainAreaActiveTextEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function debugRubyFile(context: ExtensionContext, uri?: vscode.Uri): Promise<void> {
  const targetUri = uri ?? mainAreaActiveTextEditorUri();
  if (!targetUri) {
    context.log.info('DebugRuby: No target file.');
    return;
  }

  if (targetUri.scheme !== 'file') {
    context.log.info(
      'DebugRuby: File must be local to be debugged.',
      vscode.workspace.asRelativePath(targetUri),
    );
    return;
  }

  const document = await vscode.workspace.openTextDocument(targetUri);
  if (document.isDirty) {
    context.log.debug(
      'DebugRuby: Saving file before debugging.',
      vscode.workspace.asRelativePath(document.uri),
    );
    await document.save();
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
  if (isDebuggerTypeAvailable('rdbg')) {
    context.log.debug('DebugRuby: Using registered `rdbg` debugger type');
    await vscode.debug.startDebugging(workspaceFolder, {
      cwd: workspaceFolder?.uri,
      name: `Debug ${basename(document.fileName)}`,
      request: 'launch',
      script: document.fileName,
      type: 'rdbg',
    });
  } else if (await verifyEnvironment(context, ['ruby', 'bundle', 'rdbg'])) {
    context.log.debug('DebugRuby: Using `rdbg` executable');
    const targetPath = vscode.workspace.asRelativePath(targetUri, false);
    await executeCommandsInTerminal({
      commands: [`bundle exec rdbg ${targetPath}`],
      cwd: workspaceFolder?.uri,
      name: `Debug ${basename(targetPath)}`,
    });
  } else {
    context.log.error('DebugRuby: No registered `rdbg` debugger-type or executable found');
    vscode.window.showErrorMessage(
      '`rdbg` debugger not found. Install a Ruby debugger extension or ensure `rdbg` is available in your environment.',
    );
  }
}

function isDebuggerTypeAvailable(type: string): boolean {
  return vscode.extensions.all.some((ext) => {
    const debuggers = ext.packageJSON?.contributes?.debuggers as any[] | undefined;
    return !!debuggers?.some((d) => d.type === type);
  });
}
