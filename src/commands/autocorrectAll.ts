import * as vscode from 'vscode';
import { SorbetClientStatus } from '../clientHost/sorbetClientStatus';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getClientHost } from './utils';

export async function autocorrectAll(
  context: ExtensionContext,
  contextPathOrUri?: string | vscode.Uri,
  codes?: number[],
) {
  const clientHost = await getClientHost(context, contextPathOrUri);
  if (clientHost?.status !== SorbetClientStatus.Running) {
    context.log.warn(
      'AutocorrectAll: No Sorbet client is available. Status:',
      clientHost?.status,
      contextPathOrUri instanceof vscode.Uri ? contextPathOrUri.toString(true) : contextPathOrUri,
    );
    return;
  }

  const targetErrorCodes = codes || (await getErrorCodes());
  if (!targetErrorCodes) {
    return;
  }

  const sorbetCommand = clientHost.configuration.sorbetTypecheckCommand.join(' ').trim();
  await executeCommandsInTerminal({
    commands: [
      `${sorbetCommand} --autocorrect ${targetErrorCodes.map((c) => `--isolate-error-code=${c}`).join(' ')}`,
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
      if (values.some((v) => Number.isNaN(v) || !Number.isInteger(v))) {
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
      .map((v) => v.trim())
      .filter((v) => v)
      .map((v) => Number(v));
  }
}
