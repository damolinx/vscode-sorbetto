import { commands, MessageItem, window } from 'vscode';
import { LspConfigurationType } from '../configuration/lspConfigurationType';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { RestartReason } from '../types';

export async function restartSorbet(context: SorbetExtensionContext, reason: RestartReason = RestartReason.COMMAND) {
  // if (context.statusProvider.serverStatus === ServerStatus.DISABLED
  //   &&
  // TODO: if not active workspace, all UI or current.
  if (context.configuration.lspConfigurationType === LspConfigurationType.Disabled) {
    const updateConfigItem: MessageItem = { title: 'Configure' };
    const selection = await window.showWarningMessage(
      'Sorbet is disabled by configuration.',
      { modal: true },
      updateConfigItem);
    if (selection === updateConfigItem) {
      await commands.executeCommand('workbench.action.openWorkspaceSettings', 'sorbetto.sorbetLspConfiguration');
    }
    return;
  }

  await context.clientManager.restartSorbet(reason);
}