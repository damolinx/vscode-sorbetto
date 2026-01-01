import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { SorbetClientStatus } from '../lspClient/sorbetClientStatus';

export async function peekUsages(
  context: ExtensionContext,
  { document, selection }: vscode.TextEditor,
): Promise<void> {
  const client = context.clientManager.getClient(document.uri);
  if (client?.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'FindAllUsages: No Sorbet client for editor.',
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  const locations = await client.sendHierarchyReferences(document, selection.start);
  if (!locations?.length) {
    context.log.debug(
      'FindAllUsages: Found no reference(s).',
      vscode.workspace.asRelativePath(document.uri),
    );
    return;
  }

  const vsLocations = locations?.map(
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
