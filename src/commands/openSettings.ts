import * as vscode from 'vscode';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function openSettings(
  _context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
  setting = 'sorbetto',
) {
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.parse(pathOrUri)
    : vscode.window.activeTextEditor?.document.uri;

  const inspectedConfiguration = vscode.workspace.getConfiguration(undefined, uri).inspect(setting);
  let command: string | undefined;
  if (inspectedConfiguration?.workspaceFolderValue !== undefined) {
    command = 'workbench.action.openFolderSettings';
  } else if (inspectedConfiguration?.workspaceValue !== undefined) {
    command = 'workbench.action.openWorkspaceSettings';
  } else {
    command = 'workbench.action.openSettings';
  }

  if (uri) {
    await vscode.window.showTextDocument(uri, { preview: true });
  }
  await vscode.commands.executeCommand(command, setting);
}
