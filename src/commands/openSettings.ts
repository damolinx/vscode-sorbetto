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
  context.log.debug('Open settings', contextUri ? vscode.workspace.asRelativePath(contextUri) : '');

  const inspectedConfiguration = vscode.workspace
    .getConfiguration(undefined, contextUri)
    .inspect(setting);
  let command: string | undefined;
  if (inspectedConfiguration?.workspaceFolderValue !== undefined) {
    command = 'workbench.action.openFolderSettings';
  } else if (inspectedConfiguration?.workspaceValue !== undefined) {
    command = 'workbench.action.openWorkspaceSettings';
  } else {
    command = 'workbench.action.openSettings';
  }

  await vscode.commands.executeCommand(command, setting);
}
