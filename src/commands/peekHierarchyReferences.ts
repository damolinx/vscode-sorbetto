import * as vscode from 'vscode';
import { SorbetClientStatus } from '../clientHost/sorbetClientStatus';
import { ExtensionContext } from '../extensionContext';

export async function peekHierarchyReferences(
  context: ExtensionContext,
  { document, selection }: vscode.TextEditor,
): Promise<void> {
  const clientHost = context.clientManager.getClientHost(document.uri);
  if (!clientHost?.languageClient || clientHost.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'HierarchyReferences: No Sorbet client is available. Status:',
      clientHost?.status,
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  const locations = await clientHost.languageClient.sendHierarchyReferencesRequest(
    document,
    selection.start,
  );
  if (!locations?.length) {
    context.log.debug(
      'FindAllUsages: Found no reference(s).',
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
    'FindAllUsages: Found',
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
