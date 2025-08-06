import * as vscode from 'vscode';
import { executeCommandsInTerminal } from './utils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function autocorrectAll({ configuration }: SorbetExtensionContext, code: string | number, contextUri: vscode.Uri) {
  const sorbetCommand = configuration.sorbetTypecheckCommand.join(' ').trim();
  await executeCommandsInTerminal(
    {
      commands: [`${sorbetCommand} --autocorrect --isolate-error-code=${code}`],
      cwd: vscode.workspace.getWorkspaceFolder(contextUri)?.uri,
      name: 'sorbet autocorrect',
      preserveFocus: true,
    });
}