import * as vscode from 'vscode';
import { PACKAGE_FILENAME } from '../constants';
import { ExtensionContext } from '../extensionContext';

export async function createPackage(
  context: ExtensionContext,
  contextUri: vscode.Uri,
  packageName?: string,
): Promise<vscode.TextEditor | undefined> {
  const packageDirUri = await vscode.workspace.fs
    .stat(contextUri)
    .then(({ type }) =>
      type & vscode.FileType.Directory ? contextUri : vscode.Uri.joinPath(contextUri, '..'),
    );
  const packageUri = vscode.Uri.joinPath(packageDirUri, PACKAGE_FILENAME);
  const snippetPackageName = packageName?.trim() || createPackageName(packageDirUri);
  context.log.debug(
    `CreatePackage: Package. Namespace: ${snippetPackageName} Path: ${vscode.workspace.asRelativePath(packageUri)}`,
  );

  const editor = await vscode.window.showTextDocument(packageUri.with({ scheme: 'untitled' }));
  await editor.insertSnippet(createSnippet(snippetPackageName));
  return editor;
}

function camelize(segment: string): string {
  return segment
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.substring(0, 1).toUpperCase() + part.substring(1))
    .join('');
}

function createPackageName(packageDirUri: vscode.Uri): string {
  // TODO: Within Stripe, suggestion should prepend `Opus`, ignore `lib` 
  // and maybe follow PBAL rules but for a general implementation, this 
  // should be supported by allowed via configured script.
  const packageNamespace = vscode.workspace
    .asRelativePath(packageDirUri, false)
    .split('/')
    .map(camelize)
    .join('::');
  return packageNamespace.trim() || 'MyPackage';
}

function createSnippet(packageName: string) {
  const snippet = [
    '# typed: strict',
    '',
    `class \${1:${packageName}} < PackageSpec`,
    '  $0',
    'end',
  ].join('\n');
  return new vscode.SnippetString(snippet);
}
