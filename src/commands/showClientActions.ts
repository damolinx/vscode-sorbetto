import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { openSettings } from './openSettings';
import { runClientAction } from './runClientAction';
import { getClientHost } from './utils';

type CommandQuickPickItem = vscode.QuickPickItem & {
  command: () => Promise<void> | void;
};

export async function showClientActions(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
): Promise<void> {
  const items = await getContextualItems(context, contextUri);
  if (!items) {
    await vscode.window.showWarningMessage('No Sorbet actions are available');
    return;
  }

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an action',
  });
  if (!selection) {
    return;
  }

  await selection.command();
}

async function getContextualItems(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
): Promise<CommandQuickPickItem[] | undefined> {
  const clientHost = await getClientHost(context, contextUri);
  if (!clientHost) {
    context.log.warn(
      'ShowActions: No Sorbet client is available.',
      contextUri ? vscode.workspace.asRelativePath(contextUri) : '',
    );
    return undefined;
  }

  const items: CommandQuickPickItem[] = [
    {
      command: () => context.log.show(true),
      label: 'View Output',
    },
  ];

  const { uri } = clientHost.workspaceFolder;

  if (clientHost.isActive()) {
    items.unshift(
      {
        command: () => runClientAction(context, 'restart', uri),
        label: 'Restart Sorbet',
      },
      {
        command: () => runClientAction(context, 'stop', uri),
        label: 'Stop Sorbet',
      },
    );
  } else if (clientHost.isEnabledByConfiguration()) {
    items.unshift({
      command: () => runClientAction(context, 'start', uri),
      label: 'Start Sorbet',
    });
  } else {
    items.unshift({
      command: () => openSettings(context, uri, 'sorbetto.sorbetLspConfiguration'),
      label: 'Open Sorbet Settings',
      description: 'Sorbet is disabled by setting',
    });
  }

  return items;
}
