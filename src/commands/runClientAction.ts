import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { openSettings } from './openSettings';
import { getClientHost } from './utils';

export async function runClientAction(
  context: ExtensionContext,
  action: 'start' | 'stop' | 'restart',
  contextPathOrUri?: string | vscode.Uri,
) {
  const clientHost = await getClientHost(context, contextPathOrUri);
  if (!clientHost) {
    context.log.warn(
      'Restart: No Sorbet client is available.',
      contextPathOrUri instanceof vscode.Uri ? contextPathOrUri.toString(true) : contextPathOrUri,
    );
    return;
  }

  switch (action) {
    case 'restart':
      await (clientHost.isEnabledByConfiguration()
        ? clientHost.restart()
        : showDisabledConfigurationNotification(clientHost.workspaceFolder));
      break;
    case 'start':
      await (clientHost.isEnabledByConfiguration()
        ? clientHost.start()
        : showDisabledConfigurationNotification(clientHost.workspaceFolder));
      break;
    case 'stop':
      await clientHost.stop();
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  async function showDisabledConfigurationNotification({ uri }: vscode.WorkspaceFolder) {
    const updateConfigItem: vscode.MessageItem = { title: 'Configure' };
    const selection = await vscode.window.showWarningMessage(
      'Sorbet is disabled by configuration.',
      updateConfigItem,
    );
    if (selection === updateConfigItem) {
      await openSettings(context, uri, 'sorbetto.sorbetLsp');
    }
  }
}
