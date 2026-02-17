import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { getTargetWorkspaceFolder } from './utils';

export async function openSettings(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
  setting = 'sorbetto',
) {
  const workspaceFolder = await getTargetWorkspaceFolder(
    context,
    contextUri ?? mainAreaActiveEditorUri(),
  );
  if (!workspaceFolder) {
    context.log.warn('OpenSettings: No context URI to open package for');
    return;
  }

  context.log.info('OpenSettings:', setting, workspaceFolder.uri.toString(true));
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
