import * as vscode from 'vscode';
import { PACKAGE_FILENAME } from '../constants';
import { ExtensionContext } from '../extensionContext';

export async function createPackage(
  context: ExtensionContext,
  pathOrUri: string | vscode.Uri,
  packageNamespace = 'PackageName',
): Promise<vscode.TextEditor | undefined> {
  const uri = pathOrUri instanceof vscode.Uri ? pathOrUri : vscode.Uri.file(pathOrUri);
  const uriDir = await vscode.workspace.fs
    .stat(uri)
    .then(({ type }) =>
      type === vscode.FileType.Directory ? uri : vscode.Uri.joinPath(uri, '..'),
    );
  context.log.debug('CreatePackage: Target directory', uriDir.toString(true));

  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    defaultUri: uriDir,
  });
  if (!selection) {
    return;
  }

  const packageUri = vscode.Uri.joinPath(selection[0], PACKAGE_FILENAME).with({
    scheme: 'untitled',
  });

  const editor = await vscode.window.showTextDocument(packageUri);
  await editor.insertSnippet(createSnippet(packageNamespace));
  return editor;
}

function createSnippet(packageNamespace: string) {
  const snippet = [
    '# typed: strict',
    '',
    "require 'sorbet-runtime'",
    '',
    `class \${1:${packageNamespace}} < PackageSpec`,
    '  $0',
    'end',
  ].join('\n');
  return new vscode.SnippetString(snippet);
}
