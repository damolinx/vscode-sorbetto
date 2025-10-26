import * as vscode from 'vscode';
import { OPEN_SETTINGS_ID } from '../commandIds';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { getTargetWorkspaceUri } from './utils';

export async function restartSorbet(
  context: ExtensionContext,
  action: 'start' | 'stop' | 'restart',
  pathOrUri?: string | vscode.Uri,
) {
  const uri = await getTargetWorkspaceUri(pathOrUri ?? mainAreaActiveEditorUri(), {
    forceSorbetWorkspace: true,
  });
  if (!uri) {
    context.log.debug('No target workspace.', action);
    return; // No target workspace
  }

  const client = context.clientManager.getClient(uri);
  if (!client) {
    context.log.info('No Sorbet client for selected workspace.', action, uri.toString(true));
    return;
  }

  switch (action) {
    case 'restart':
      if (!client.isEnabledByConfiguration()) {
        await showDisabledConfigurationNotification(uri);
        return;
      }
      await client.restart();
      break;
    case 'start':
      if (!client.isEnabledByConfiguration()) {
        await showDisabledConfigurationNotification(uri);
        return;
      }
      await client.start();
      break;
    case 'stop':
      await client.stop();
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
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
