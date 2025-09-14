import * as vscode from 'vscode';
import { isAvailable } from '../common/processUtils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export const DEFAULT_COMMANDS: readonly string[] = ['bundle', 'ruby', 'srb'];

export async function verifyEnvironment(
  _context: SorbetExtensionContext,
  ...commandsToCheck: string[]
): Promise<boolean> {
  const targetCommands = commandsToCheck.length ? commandsToCheck : DEFAULT_COMMANDS;
  const results = await Promise.all(targetCommands.map((cmd) => isAvailable(cmd)));
  const missingCommands = targetCommands.filter((_, i) => !results[i]);
  if (missingCommands.length === 0) {
    return true;
  }

  const DOC_OPTION = 'Documentation';
  const option = await vscode.window.showErrorMessage(
    `The following expected dependencies are missing: ${missingCommands.join(', ')}. Install them manually (refer to the documentation for instructions). Restart VS Code if your environment does not detect them after installation.`,
    DOC_OPTION,
  );

  // Don't await
  switch (option) {
    case DOC_OPTION:
      vscode.env.openExternal(vscode.Uri.parse('https://sorbet.org/docs/adopting'));
      break;
  }

  return false;
}
