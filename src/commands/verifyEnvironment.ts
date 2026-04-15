import * as vscode from 'vscode';
import { isAvailable } from '../common/processUtils';
import { ExtensionContext } from '../extensionContext';

const Commands = new Map<string, { title: string; url: string }>([
  ['bundle', { title: 'Bundler', url: 'https://bundler.io/' }],
  ['ruby', { title: 'Sorbet', url: 'https://sorbet.org/docs/adopting' }],
]);

export async function verifyEnvironment(
  context: ExtensionContext,
  cmds: string[] = Array.from(Commands.keys()),
): Promise<boolean> {
  const results = await Promise.all(
    cmds.map(async (cmd) => [cmd, await isAvailable(cmd)] as const),
  );
  const missingCmds = results.filter(([, ok]) => !ok).map(([cmd]) => cmd);
  if (missingCmds.length === 0) {
    context.log.debug('VerifyEnvironment: Found all commands', cmds);
    return true;
  }

  const option = await vscode.window.showErrorMessage(
    `Missing dependencies: ${missingCmds.join(', ')}. Refer to documentation.`,
    ...missingCmds.map((cmd) => Commands.get(cmd)).filter((cmd) => !!cmd),
  );

  if (option) {
    vscode.env.openExternal(vscode.Uri.parse(option.url));
  }

  return false;
}
