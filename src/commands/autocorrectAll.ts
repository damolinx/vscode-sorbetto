import * as vscode from 'vscode';
import { executeCommandsInTerminal } from './utils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { DEFAULT_SORBET_TYPECHECK } from '../configuration/configuration';

export async function autocorrectAll(_context: SorbetExtensionContext, code: string | number, contextUri: vscode.Uri) {
  const sorbetCommand = DEFAULT_SORBET_TYPECHECK.join(' ');
  await executeCommandsInTerminal(
    {
      commands: [`${sorbetCommand} --autocorrect --isolate-error-code=${code}`],
      cwd: vscode.workspace.getWorkspaceFolder(contextUri)?.uri,
      name: 'sorbet autocorrect',
      preserveFocus: true,
    });
}