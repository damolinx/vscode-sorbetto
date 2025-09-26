import * as vscode from 'vscode';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { LspStatus } from '../types';
import { anySorbetWorkspace } from '../workspaceUtils';
import { OPEN_SETTINGS_ID } from './commandIds';
import { getTargetWorkspaceUri } from './utils';

export async function restartSorbet(
  context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
) {
  //TODO: With settings - bad
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.parse(pathOrUri)
    : (vscode.window.activeTextEditor?.document.uri ?? (await getTargetWorkspaceUri()));
  if (!uri) {
    return; // No target workspace
  }

  const client = context.clientManager.getClient(uri);
  if (!client) {
    context.log.info('No Sorbet client for the selected workspace.', uri.toString());
    return;
  }

  if (client.status === LspStatus.Disabled && !client.isEnabledByConfiguration()) {
    await showDisabledConfigurationNotification(uri);
    return;
  } else if (!vscode.workspace.workspaceFolders?.length) {
    await showNoWorkspaceNotification();
    return;
  } else if (!(await anySorbetWorkspace())) {
    await showMissingSorbetWorkspaceNotification();
    return;
  }

  await client.restart();
}

async function showDisabledConfigurationNotification(uri: vscode.Uri) {
  const updateConfigItem: vscode.MessageItem = { title: 'Configure' };
  const selection = await vscode.window.showWarningMessage(
    'Sorbet is disabled by configuration.',
    updateConfigItem,
  );
  if (selection === updateConfigItem) {
    await vscode.commands.executeCommand(OPEN_SETTINGS_ID, uri, 'sorbetto.sorbetLspConfiguration');
  }
}

async function showMissingSorbetWorkspaceNotification() {
  const setupWorkspaceItem: vscode.MessageItem = { title: 'Setup' };
  const selection = await vscode.window.showWarningMessage(
    'Workspace is not setup to run Sorbet.',
    setupWorkspaceItem,
  );
  if (selection === setupWorkspaceItem) {
    await vscode.commands.executeCommand('sorbetto.setup.workspace');
  }
}

async function showNoWorkspaceNotification() {
  await vscode.window.showWarningMessage('No workspace is open, Sorbet cannot be started');
}
