import * as vscode from 'vscode';
import { SorbetClientHost } from '../clientHost/sorbetClientHost';
import { mainAreaActiveEditorUri } from '../common/utils';
import { isSorbetWorkspace } from '../common/workspaceUtils';
import { ExtensionContext } from '../extensionContext';
import { setupWorkspace } from './setupWorkspace';

const RUBY_ICON = new vscode.ThemeIcon('ruby');

export async function executeCommandsInTerminal(options: {
  commands: string[];
  cwd?: string | vscode.Uri;
  iconPath?: vscode.IconPath;
  name?: string;
  preserveFocus?: boolean;
}) {
  const cmd = options.commands.join(' && ').trim();
  const terminalOptions: vscode.TerminalOptions = {
    cwd: options.cwd,
    iconPath: options.iconPath ?? RUBY_ICON,
    message: `\x1b[1mRunning:\x1b[0m ${cmd}`,
    name: options.name,
  };
  if (process.platform === 'win32') {
    terminalOptions.shellArgs = ['/K', `${cmd} && pause`];
    terminalOptions.shellPath = 'cmd.exe';
  } else {
    terminalOptions.shellArgs = ['-c', `${cmd}; read -n1 -rsp "Press any key to continue ..."`];
    terminalOptions.shellPath = '/bin/bash';
  }

  const terminal = vscode.window.createTerminal(terminalOptions);
  terminal.show(options.preserveFocus);
  return terminal;
}

export async function getClientHost(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
): Promise<SorbetClientHost | undefined> {
  const targetUri = contextUri ?? mainAreaActiveEditorUri();
  const workspaceFolder = await getTargetWorkspaceFolder(context, targetUri);
  if (!workspaceFolder) {
    context.log.debug('Restart: No workspace found for context', targetUri?.toString(true));
    return;
  }

  const clientHost = context.clientManager.getClientHost(workspaceFolder);
  return clientHost;
}

export async function getTargetWorkspaceFolder(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
  options?: { skipSorbetWorkspaceVerification?: true },
): Promise<vscode.WorkspaceFolder | undefined> {
  let workspaceFolder: vscode.WorkspaceFolder | undefined;
  if (contextUri) {
    const candidateWorkspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
    if (candidateWorkspaceFolder && (await isSorbetWorkspace(candidateWorkspaceFolder))) {
      workspaceFolder = candidateWorkspaceFolder;
    }
  }

  if (!workspaceFolder) {
    const { workspaceFolders } = vscode.workspace;
    if (workspaceFolders?.length) {
      if (workspaceFolders.length === 1) {
        workspaceFolder = workspaceFolders[0];
      } else {
        const candidateWorkspaceFolder = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select a workspace folder',
        });
        if (candidateWorkspaceFolder) {
          if (
            !options?.skipSorbetWorkspaceVerification &&
            !(await isSorbetWorkspace(candidateWorkspaceFolder))
          ) {
            await showNotSorbetEnabledWarning(context, candidateWorkspaceFolder);
          } else {
            workspaceFolder = candidateWorkspaceFolder;
          }
        }
      }
    }
  }

  return workspaceFolder;
}

async function showNotSorbetEnabledWarning(
  context: ExtensionContext,
  workspaceFolder: vscode.WorkspaceFolder,
) {
  const setupWorkspaceItem: vscode.MessageItem = { title: 'Setup Workspace' };
  const option = await vscode.window.showErrorMessage(
    `${workspaceFolder.name} is not Sorbet-enabled`,
    {
      modal: true,
      detail:
        "A workspace is considered Sorbed-enabled if it contains a 'sorbet/' configuration folder.",
    },
    setupWorkspaceItem,
    { title: 'Cancel', isCloseAffordance: true },
  );
  if (option === setupWorkspaceItem) {
    setupWorkspace(context, workspaceFolder.uri);
  }
}
