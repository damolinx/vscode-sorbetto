import { TerminalOptions, Uri, window } from 'vscode';

export async function executeCommandsInTerminal(options: { commands: string[], name?: string, cwd?: string | Uri, preserveFocus?: boolean }) {
  const cmd = options.commands.join('&&').trim();
  const terminalOptions: TerminalOptions = {
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

  const terminal = window.createTerminal(terminalOptions);
  terminal.show(options.preserveFocus);
}