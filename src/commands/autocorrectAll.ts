import * as vscode from 'vscode';
import { SorbetClientStatus } from '../clientHost/sorbetClientStatus';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getClientHost } from './utils';

export async function autocorrectAll(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
  codes?: number[],
) {
  const clientHost = await getClientHost(context, contextUri);
  if (!clientHost) {
    context.log.warn(
      'AutocorrectAll: No Sorbet client available.',
      contextUri ? vscode.workspace.asRelativePath(contextUri) : '',
    );
    return;
  }

  if (clientHost.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'AutocorrectAll: Sorbet client is not ready. Status:',
      clientHost.status,
      clientHost.workspaceFolder.uri.toString(true),
    );
    return;
  }

  const targetCodes = codes || (await getErrorCodes());
  if (!targetCodes?.length) {
    context.log.warn(
      'AutocorrectAll: No errors to correct',
      clientHost.workspaceFolder.uri.toString(true),
    );
    return;
  }

  const sorbetCommand = clientHost.configuration.sorbetTypecheckCommand.join(' ').trim();
  await executeCommandsInTerminal({
    commands: [
      `${sorbetCommand} --autocorrect ${targetCodes.map((c) => `--isolate-error-code=${c}`).join(' ')}`,
    ],
    cwd: clientHost.workspaceFolder.uri,
    name: 'autocorrect',
    preserveFocus: true,
  });
}

async function getErrorCodes(): Promise<number[] | undefined> {
  const input = await vscode.window.showInputBox({
    title: 'Autocorrect (All Files)',
    placeHolder: 'Sorbet error codes, comma-separated (e.g. 3717,3718)',
    prompt:
      'Apply Sorbet autocorrects for one or more error codes across all files. Note: some codes have no fixes, and other have multiple fixes so Sorbet picks one to apply.',
    validateInput: (value) => {
      const values = parse(value);
      if (values.length === 0) {
        return 'Enter at least one error code';
      }
      if (values.some((v) => !Number.isInteger(v))) {
        return 'Error codes must be integer numbers';
      }
      if (values.some((v) => v < 1000)) {
        return 'Error codes must be values ≥ 1000';
      }
      return;
    },
  });

  return input ? [...new Set(parse(input))] : undefined;

  function parse(value: string) {
    return value
      .split(',')
      .filter((v) => v.trim())
      .map((v) => Number(v));
  }
}
