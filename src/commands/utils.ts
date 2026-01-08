import * as vscode from 'vscode';
import { SETUP_WORKSPACE_ID } from '../commandIds';
import { mainAreaActiveTextEditorUri } from '../common/utils';
import { isSorbetWorkspace } from '../common/workspaceUtils';

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
    terminalOptions.shellPath = 'cmd.exe';
    terminalOptions.shellArgs = ['/K', `${cmd} && pause`];
  } else {
    terminalOptions.shellPath = '/bin/bash';
    terminalOptions.shellArgs = ['-c', `${cmd}; read -n1 -rsp "Press any key to continue ..."`];
  }

  const terminal = vscode.window.createTerminal(terminalOptions);
  terminal.show(options.preserveFocus);
  return terminal;
}

export function getTargetEditorUri(pathOrUri?: string | vscode.Uri): vscode.Uri | undefined {
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.parse(pathOrUri)
    : mainAreaActiveTextEditorUri();
  return uri;
}

export async function getTargetWorkspaceUri(
  contextPathOrUri?: string | vscode.Uri,
  options?: { forceSorbetWorkspace?: true },
): Promise<vscode.Uri | undefined> {
  let uri: vscode.Uri | undefined;
  if (contextPathOrUri) {
    const contextUri =
      contextPathOrUri instanceof vscode.Uri
        ? contextPathOrUri
        : vscode.Uri.parse(contextPathOrUri);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(contextUri);
    if (workspaceFolder && (await isSorbetWorkspace(workspaceFolder))) {
      uri = workspaceFolder.uri;
    }
  }

  if (!uri) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    switch (workspaceFolders?.length) {
      case 0:
      case undefined:
        break;
      case 1:
        uri = workspaceFolders[0].uri;
        break;
      default:
        // eslint-disable-next-line no-case-declarations
        const workspaceFolder = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select a workspace folder',
        });
        if (workspaceFolder) {
          if (options?.forceSorbetWorkspace && !(await isSorbetWorkspace(workspaceFolder))) {
            await showNotSorbetEnabledWarning(workspaceFolder);
          } else {
            uri = workspaceFolder.uri;
          }
        }
        break;
    }
  }

  return uri;
}

export async function showNotSorbetEnabledWarning(workspaceFolder: vscode.WorkspaceFolder) {
  const setupWorkspace: vscode.MessageItem = { title: 'Setup Workspace' };
  const option = await vscode.window.showErrorMessage(
    `${workspaceFolder.name} is not Sorbet-enabled`,
    {
      modal: true,
      detail:
        "A workspace is considered Sorbed-enabled if it contains a 'sorbet/' configuration folder.",
    },
    setupWorkspace,
    { title: 'Cancel', isCloseAffordance: true },
  );
  if (option === setupWorkspace) {
    await vscode.commands.executeCommand(SETUP_WORKSPACE_ID, workspaceFolder.uri);
  }
}
