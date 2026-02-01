import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { getTargetWorkspaceUri } from './utils';

export async function openSettings(
  context: ExtensionContext,
  contextPathOrUri?: string | vscode.Uri,
  setting = 'sorbetto',
) {
  const workspaceUri = await getTargetWorkspaceUri(
    context,
    contextPathOrUri ?? mainAreaActiveEditorUri(),
  );
  if (!workspaceUri) {
    return;
  }

  context.log.debug('Open settings', setting, workspaceUri.toString(true));
  await vscode.commands.executeCommand(getCommand(), setting);
}

function getCommand() {
  const workspaceCount = vscode.workspace.workspaceFolders?.length;
  if (!workspaceCount) {
    return 'workbench.action.openSettings';
  } else if (workspaceCount === 1) {
    return 'workbench.action.openWorkspaceSettings';
  } else {
    return 'workbench.action.openFolderSettings';
  }
}
