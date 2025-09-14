import * as vscode from 'vscode';
import { isAvailable } from '../common/processUtils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function verifyEnvironment(_context: SorbetExtensionContext): Promise<boolean> {
  const commandsToCheck = ['srb', 'bundle'];
  const results = await Promise.all(commandsToCheck.map((cmd) => isAvailable(cmd)));
  const missingCommands = commandsToCheck.filter((_, i) => !results[i]);
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
