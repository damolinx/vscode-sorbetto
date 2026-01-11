import * as vscode from 'vscode';
import { basename } from 'path';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getTargetEditorUri } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function debugRubyFile(context: ExtensionContext, pathOrUri?: string | vscode.Uri) {
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

  if (isDebuggerTypeAvailable('rdbg')) {
    context.log.info('DebugRuby: Using registered `rdbg` debugger type');
    await vscode.debug.startDebugging(workspaceFolder, {
      type: 'rdbg',
      name: `Debug ${basename(document.fileName)}`,
      request: 'launch',
      cwd: workspaceFolder?.uri.fsPath,
      script: document.fileName,
    });
  } else if (await verifyEnvironment(context, ['ruby', 'bundle', 'rdbg'])) {
    context.log.info('DebugRuby: Using `rdbg` executable');
    await executeCommandsInTerminal({
      commands: [`bundle exec rdbg ${targetPath}`],
      cwd: workspaceFolder?.uri.fsPath,
      name: `Debug ${basename(targetPath)}`,
    });
  } else {
    context.log.error('DebugRuby: No registered `rdbg` debugger-type or executable found');
    vscode.window.showErrorMessage(
      'No `rdbg` debugger detected. Install a Ruby debug extension or ensure `rdbg` is available in your environment.',
    );
  }
}

function isDebuggerTypeAvailable(type: string): boolean {
  return vscode.extensions.all.some((ext) => {
    const contributes = ext.packageJSON?.contributes;
    const debuggers = contributes?.debuggers as any[] | undefined;
    return !!debuggers?.some((d) => d.type === type);
  });
}
