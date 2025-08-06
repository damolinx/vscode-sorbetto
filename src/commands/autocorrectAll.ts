import * as vscode from 'vscode';
import { executeCommandsInTerminal } from './utils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function autocorrectAll({ configuration }: SorbetExtensionContext, code: string | number, contextUri: vscode.Uri) {
  const sorbetCommand = configuration.getValue('sorbetToolCmd', 'bundle exec srb');
  await executeCommandsInTerminal(
    {
      commands: [`${sorbetCommand} tc --autocorrect --isolate-error-code=${code}`],
      cwd: vscode.workspace.getWorkspaceFolder(contextUri)?.uri,
      name: 'sorbet autocorrect',
      preserveFocus: true,
    });
}