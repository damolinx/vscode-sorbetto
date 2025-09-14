import * as vscode from 'vscode';
import { isAvailable } from '../common/processUtils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export const SORBET_COMMANDS: readonly string[] = ['bundle', 'ruby', 'srb'];

export async function verifyEnvironment(
  _context: SorbetExtensionContext,
  ...commandsToCheck: string[]
): Promise<boolean> {
  const targetCommands = commandsToCheck.length ? commandsToCheck : SORBET_COMMANDS;
  const results = await Promise.all(targetCommands.map((cmd) => isAvailable(cmd)));
  const missingCommands = targetCommands.filter((_, i) => !results[i]);
  if (missingCommands.length === 0) {
    return true;
  }

  const docs = getDocumentationLinks(missingCommands);
  const option = await vscode.window.showErrorMessage(
    `The following expected dependencies are missing: ${missingCommands.join(', ')}. Install them manually, refer to documentation.`,
    ...docs.keys(),
  );

  if (option) {
    const uri = docs.get(option);
    if (uri) {
      vscode.env.openExternal(uri);
    }
  }

  return false;
}

export function getDocumentationLinks(missingCommands: string[]): Map<string, vscode.Uri> {
  const links = new Map<string, vscode.Uri>();
  for (const missingCommand of missingCommands) {
    if (SORBET_COMMANDS.includes(missingCommand)) {
      links.set('Sorbet Docs', vscode.Uri.parse('https://sorbet.org/docs/adopting'));
    } else if (missingCommand === 'rdbg') {
      links.set('rdbg Docs', vscode.Uri.parse('https://github.com/ruby/debug'));
    }
  }
  return links;
}
