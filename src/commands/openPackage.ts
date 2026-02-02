import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { getTargetWorkspaceUri } from './utils';

const PACKAGE_NAME = '__package.rb';
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
    const candidate = vscode.Uri.joinPath(currentDir, PACKAGE_NAME);
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
    const editor = await createPackage(uriDir);
    return editor;
  }

  return;
}

async function createPackage(dir: vscode.Uri, packageName = 'PackageName') {
  const packageSnippet = [
    '# typed: strict',
    '',
    "require 'sorbet-runtime'",
    '',
    `class \${1:${packageName}} < PackageSpec`,
    '  $0',
    'end',
  ].join('\n');

  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    defaultUri: dir,
  });
  if (!selection) {
    return;
  }

  const packageUri = vscode.Uri.joinPath(selection[0], PACKAGE_NAME).with({ scheme: 'untitled' });
  const editor = await vscode.window.showTextDocument(packageUri);
  await editor.insertSnippet(new vscode.SnippetString(packageSnippet));
  return editor;
}
