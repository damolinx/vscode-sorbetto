import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { getTargetWorkspaceUri } from './utils';

export async function openSettings(
  context: ExtensionContext,
  contextPathOrUri?: string | vscode.Uri,
  setting = 'sorbetto',
) {
  const contextUri = contextPathOrUri
    ? contextPathOrUri instanceof vscode.Uri
      ? contextPathOrUri
      : vscode.Uri.parse(contextPathOrUri)
    : (mainAreaActiveEditorUri() ?? (await getTargetWorkspaceUri()));
  context.log.debug(
    'Open settings',
    setting,
    contextUri ? vscode.workspace.asRelativePath(contextUri) : '',
  );

  let command: string | undefined;

  const workspaceCount = vscode.workspace.workspaceFolders?.length ?? 0;
  if (workspaceCount === 1) {
    command = 'workbench.action.openWorkspaceSettings';
  } else if (workspaceCount > 1) {
    command = 'workbench.action.openFolderSettings';
  } else {
    command = 'workbench.action.openSettings';
  }

  await vscode.commands.executeCommand(command, setting);
}
