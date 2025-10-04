import * as vscode from 'vscode';
import { safeActiveTextEditorUri } from '../common/utils';
import { isSorbetWorkspace } from '../workspaceUtils';

export async function executeCommandsInTerminal(options: {
  commands: string[];
  name?: string;
  cwd?: string | vscode.Uri;
  preserveFocus?: boolean;
}) {
  const cmd = options.commands.join('&&').trim();
  const terminalOptions: vscode.TerminalOptions = {
    cwd: options.cwd,
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
    : safeActiveTextEditorUri();
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
    uri = vscode.workspace.getWorkspaceFolder(contextUri)?.uri;
  } else {
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
            await vscode.window.showErrorMessage('Selected workspace is not Sorbet-enabled');
          } else {
            uri = workspaceFolder.uri;
          }
        }
        break;
    }
  }

  return uri;
}
