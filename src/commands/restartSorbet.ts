import * as vscode from 'vscode';
import { mainAreaActiveEditorUri } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { openSettings } from './openSettings';
import { getTargetWorkspaceFolder } from './utils';

export async function restartSorbet(
  context: ExtensionContext,
  action: 'start' | 'stop' | 'restart',
  contextPathOrUri?: string | vscode.Uri,
) {
  const targetContextPathOrUri = contextPathOrUri ?? mainAreaActiveEditorUri();
  const workspaceFolder = await getTargetWorkspaceFolder(context, targetContextPathOrUri);
  if (!workspaceFolder) {
    context.log.debug(
      'Restart: No workspace found for context',
      targetContextPathOrUri?.toString(true),
    );
    return;
  }

  const clientHost = context.clientManager.getClientHost(workspaceFolder);
  if (!clientHost) {
    context.log.warn(
      'Restart: No Sorbet client is available for workspace.',
      workspaceFolder.uri.toString(true),
    );
    return;
  }

  switch (action) {
    case 'restart':
      await (clientHost.isEnabledByConfiguration()
        ? clientHost.restart()
        : showDisabledConfigurationNotification(workspaceFolder));
      break;
    case 'start':
      await (clientHost.isEnabledByConfiguration()
        ? clientHost.start()
        : showDisabledConfigurationNotification(workspaceFolder));
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
