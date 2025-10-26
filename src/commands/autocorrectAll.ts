import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal } from './utils';

export async function autocorrectAll(
  context: ExtensionContext,
  contextUri: vscode.Uri,
  code: string | number,
) {
  const client = context.clientManager.getClient(contextUri);
  if (!client) {
    context.log.error(
      'AutocorrectAll: No Sorbet client.',
      vscode.workspace.asRelativePath(contextUri),
    );
    return;
  }

  const sorbetCommand = client.configuration.sorbetTypecheckCommand.join(' ').trim();
  await executeCommandsInTerminal({
    commands: [`${sorbetCommand} --autocorrect --isolate-error-code=${code}`],
    cwd: client.workspaceFolder.uri,
    name: 'sorbet autocorrect',
    preserveFocus: true,
  });
}
