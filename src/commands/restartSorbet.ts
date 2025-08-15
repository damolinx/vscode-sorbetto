import { commands, MessageItem, window, workspace } from 'vscode';
import { LspConfigurationType } from '../configuration/lspConfigurationType';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { RestartReason, ServerStatus } from '../types';
import { anySorbetWorkspace } from '../workspaceUtils';

export async function restartSorbet(
  context: SorbetExtensionContext,
  reason: RestartReason = RestartReason.COMMAND,
) {
  if (
    context.statusProvider.serverStatus === ServerStatus.DISABLED &&
    context.configuration.lspConfigurationType === LspConfigurationType.Disabled
  ) {
    await showDisabledConfigurationNotification();
    return;
  } else if (!workspace.workspaceFolders?.length) {
    await showNoWorkspaceNotification();
    return;
  } else if (!(await anySorbetWorkspace())) {
    await showMissingSorbetWorkspaceNotification();
    return;
  }

  await context.clientManager.restartSorbet(reason);
}

async function showDisabledConfigurationNotification() {
  const updateConfigItem: MessageItem = { title: 'Configure' };
  const selection = await window.showWarningMessage(
    'Sorbet is disabled by configuration.',
    updateConfigItem,
  );
  if (selection === updateConfigItem) {
    await commands.executeCommand(
      'workbench.action.openWorkspaceSettings',
      'sorbetto.sorbetLspConfiguration',
    );
  }
}

async function showMissingSorbetWorkspaceNotification() {
  const setupWorkspaceItem: MessageItem = { title: 'Setup' };
  const selection = await window.showWarningMessage(
    'Workspace is not setup to run Sorbet.',
    setupWorkspaceItem,
  );
  if (selection === setupWorkspaceItem) {
    await commands.executeCommand('sorbetto.setup.workspace');
  }
}

async function showNoWorkspaceNotification() {
  await window.showWarningMessage('No workspace is open, Sorbet cannot be started');
}
