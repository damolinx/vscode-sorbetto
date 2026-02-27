import * as vscode from 'vscode';
import { SorbetClientStatus } from '../clientHost/sorbetClientStatus';
import { ExtensionContext } from '../extensionContext';
import { getClientHost } from './utils';

export async function peekHierarchyReferences(
  context: ExtensionContext,
  { document, selection }: vscode.TextEditor,
): Promise<void> {
  const clientHost = await getClientHost(context, document.uri);
  if (!clientHost?.languageClient) {
    context.log.warn(
      'PeekHierarchyReferences: No Sorbet client available.',
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  if (clientHost.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'PeekHierarchyReferences: Sorbet client is not ready. Status:',
      clientHost.status,
      clientHost.workspaceFolder.uri.toString(true),
    );
    return;
  }

  const locations = await clientHost.languageClient.sendHierarchyReferencesRequest(
    document,
    selection.start,
  );
  if (!locations?.length) {
    context.log.debug(
      'PeekHierarchyReferences: Found no reference(s).',
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  const vsLocations = locations.map(
    ({ uri, range: { start, end } }) =>
      new vscode.Location(
        vscode.Uri.parse(uri),
        new vscode.Range(start.line, start.character, end.line, end.character),
      ),
  );
  context.log.debug(
    'PeekHierarchyReferences: Found',
    vsLocations?.length,
    'reference(s).',
    vscode.workspace.asRelativePath(document.uri),
  );

  // VS Code only exposes `Peek` UI. The `References` treeview is only accessible via a
  // ReferenceProvider which https://github.com/sorbet/sorbet/pull/9445 counterindicates.
  await vscode.commands.executeCommand(
    'editor.action.showReferences',
    document.uri,
    selection.start,
    vsLocations,
  );
}
