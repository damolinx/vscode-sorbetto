import * as vscode from 'vscode';

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

export async function getTargetWorkspaceUri(): Promise<vscode.Uri | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  switch (workspaceFolders?.length) {
    case 0:
    case undefined:
      return;
    case 1:
      return workspaceFolders[0].uri;
    default:
      return vscode.window
        .showWorkspaceFolderPick({
          placeHolder: 'Select a workspace folder',
        })
        .then((value) => value?.uri);
  }
}
