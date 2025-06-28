import { commands, MessageItem, window } from 'vscode';
import * as cfg from '../common/configuration';
import { LspConfigType } from '../configuration';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { RestartReason, ServerStatus } from '../types';

export async function restartSorbet(context: SorbetExtensionContext, reason: RestartReason = RestartReason.COMMAND) {
  if (context.statusProvider.serverStatus === ServerStatus.DISABLED
    && cfg.getValue('sorbetLspConfiguration', LspConfigType.Disabled) === LspConfigType.Disabled) {
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

  await context.statusProvider.restartSorbet(reason);
}