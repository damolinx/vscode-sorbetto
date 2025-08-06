import { TerminalOptions, Uri, window } from 'vscode';

export async function executeCommandsInTerminal(options: { commands: string[], name?: string, cwd?: string | Uri, preserveFocus?: boolean }) {
  const terminalOptions: TerminalOptions = {
    cwd: options.cwd,
    name: options.name,
  };
  if (process.platform === 'win32') {
    terminalOptions.shellPath = 'cmd.exe';
    terminalOptions.shellArgs = ['/K', `${options.commands.join('&&')} && pause`];
  } else {
    terminalOptions.shellPath = '/bin/bash';
    terminalOptions.shellArgs = ['-c', `${options.commands.join('&&')}; read -n1 -rsp "Press any key to continue ..."`];
  }

  const terminal = window.createTerminal(terminalOptions);
  terminal.show(options.preserveFocus);
}