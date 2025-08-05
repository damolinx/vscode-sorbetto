import * as vscode from 'vscode';
import { executeCommandsInTerminal } from './utils';

export async function autocorrectAll(code: string | number, contextUri: vscode.Uri) {
  await executeCommandsInTerminal(
    {
      commands: [`bundle exec srb tc --autocorrect --isolate-error-code=${code}`],
      cwd: vscode.workspace.getWorkspaceFolder(contextUri)?.uri,
      name: 'sorbet autocorrect',
      preserveFocus: true,
    });
}