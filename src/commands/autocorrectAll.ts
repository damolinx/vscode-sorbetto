import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal } from './utils';

export async function autocorrectAll(
  context: ExtensionContext,
  contextUri: vscode.Uri,
  code: string | number,
) {
  const configuration = context.clientManager.getClient(contextUri)?.configuration;
  if (!configuration) {
    context.log.error(
      'AutocorrectAll: No Sorbet client.',
      vscode.workspace.asRelativePath(contextUri),
    );
    return;
  }

  const sorbetCommand = configuration.sorbetTypecheckCommand.join(' ').trim();
  await executeCommandsInTerminal({
    commands: [`${sorbetCommand} --autocorrect --isolate-error-code=${code}`],
    cwd: vscode.workspace.getWorkspaceFolder(contextUri)?.uri,
    name: 'sorbet autocorrect',
    preserveFocus: true,
  });
}
