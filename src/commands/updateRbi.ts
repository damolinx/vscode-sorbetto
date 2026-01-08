import * as vscode from 'vscode';
import { join } from 'path';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getTargetWorkspaceUri } from './utils';

export type UpdateRbiType = 'annotations' | 'dsl' | 'gems' | 'gems-all' | 'todo';

export async function updateRbis(
  _context: ExtensionContext,
  updateType?: UpdateRbiType,
): Promise<void> {
  const workspaceUri = await getTargetWorkspaceUri();
  if (!workspaceUri) {
    return;
  }

  let command: string | undefined;
  if (updateType) {
    command = buildRbiTypeCommand(updateType);
  } else {
    command = await showRbiTypeCommandQuickPick();
    if (!command) {
      return;
    }
  }

  await executeCommandsInTerminal({
    commands: [command],
    cwd: workspaceUri.fsPath,
    name: 'update',
  });
}

function buildRbiTypeCommand(updateType: UpdateRbiType): string {
  switch (updateType) {
    case 'gems-all':
      return `${join('bin', 'tapioca')} gems --all`;
    default:
      return `${join('bin', 'tapioca')} ${updateType}`;
  }
}

async function showRbiTypeCommandQuickPick(): Promise<string | undefined> {
  const items: (vscode.QuickPickItem & { data: UpdateRbiType })[] = [
    {
      label: 'Annotations',
      detail: 'Fetch pre-written RBIs from rbi-central',
      data: 'annotations',
    },
    {
      label: 'DSLs',
      detail: 'Regenerate RBIs for all DSLs such as Rails',
      data: 'dsl',
    },
    {
      label: 'Gems',
      detail: 'Update RBIs only for new gems',
      data: 'gems',
    },
    {
      label: 'Gems (All)',
      detail: 'Regenerate RBIs for all gems',
      data: 'gems-all',
    },
    {
      label: 'TODO',
      detail: 'Regenerate the todo.rbi file for missing constants',
      data: 'todo',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select RBI type to update',
  });
  if (!selected) {
    return;
  }

  return buildRbiTypeCommand(selected.data);
}
