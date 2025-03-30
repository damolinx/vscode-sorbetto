import { commands, window } from 'vscode';
import {SHOW_OUTPUT_COMMAND_ID, SORBET_RESTART_COMMAND_ID} from '../commandIds';
import { RestartReason} from '../types';

export const enum Action {
  ConfigureSorbet = 'Configure Sorbet',
  RestartSorbet = 'Restart Sorbet',
  ViewOutput = 'View Output',
}

/**
 * Show available actions in a drop-down.
 * @param context Sorbet extension context.
 */
export async function showSorbetActions(): Promise<void> {
  const selectedAction = await window.showQuickPick(
    [Action.ViewOutput, Action.RestartSorbet, Action.ConfigureSorbet], {
    placeHolder: 'Select an action',
  });

  switch (selectedAction) {
    case Action.ConfigureSorbet:
      await commands.executeCommand('workbench.action.openSettings', 'sorbetto.sorbetLspConfiguration');
      break;
    case Action.RestartSorbet:
      await commands.executeCommand(SORBET_RESTART_COMMAND_ID, RestartReason.STATUS_BAR_BUTTON);
      break;
    case Action.ViewOutput:
      await commands.executeCommand(SHOW_OUTPUT_COMMAND_ID);
      break;
    default:
      break; // User canceled
  }
}
