import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { PACKAGE_FILENAME } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { createPackage } from './createPackage';
import { getTargetWorkspaceUri } from './utils';

export async function openPackage(
  context: ExtensionContext,
  contextPathOrUri: string | vscode.Uri,
): Promise<vscode.TextEditor | undefined> {
  const uri = contextPathOrUri
    ? contextPathOrUri instanceof vscode.Uri
      ? contextPathOrUri
      : vscode.Uri.file(contextPathOrUri)
    : mainAreaActiveEditorUri();
  if (!uri) {
    context.log.debug('OpenPackage: No context URI to open package for');
    return;
  }

  const workspaceUri = await getTargetWorkspaceUri(context, uri);
  if (!workspaceUri) {
    context.log.debug(
      'OpenPackage: No workspace associated with received URI to open package for',
      uri.toString(true),
    );
    return;
  }

  let uriDir = uri;
  const stat = await vscode.workspace.fs.stat(uri);
  if (stat.type === vscode.FileType.File) {
    uriDir = vscode.Uri.joinPath(uri, '..');
  }

  let currentDir = uriDir;
  do {
    const candidate = vscode.Uri.joinPath(currentDir, PACKAGE_FILENAME);
    if (
      await vscode.workspace.fs.stat(candidate).then(
        (s) => s.type === vscode.FileType.File || s.type === vscode.FileType.SymbolicLink,
        () => false,
      )
    ) {
      context.log.debug('OpenPackage: Found package', vscode.workspace.asRelativePath(candidate));
      const editor = await vscode.window.showTextDocument(candidate);
      return editor;
    }
    currentDir = vscode.Uri.joinPath(uri, '..');
  } while (currentDir.path.length > workspaceUri.path.length);

  const option = await vscode.window.showInformationMessage(
    'No __package.rb file found alongside this file or in any parent directory up to the workspace root.',
    'Create Package',
  );
  if (option) {
    const editor = await createPackage(context, uriDir);
    return editor;
  }

  return;
}
