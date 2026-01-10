import * as vscode from 'vscode';
import { SorbetConfigFlagData } from './sorbetConfigFlagData';

export const TRIGGER_CHARACTERS: readonly string[] = ['-', '='];

export class SorbetConfigCompletionProvider implements vscode.CompletionItemProvider {
  private readonly flagData: SorbetConfigFlagData;

  constructor(flagData: SorbetConfigFlagData) {
    this.flagData = flagData;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ) {
    const line = document.lineAt(position).text;
    const items: vscode.CompletionItem[] = [];

    if (position.character > 1 && line.slice(position.character - 2, position.character) === '--') {
      for (const flag of this.flagData.flags) {
        const item = new vscode.CompletionItem(flag.name, vscode.CompletionItemKind.Keyword);
        item.detail = flag.description;
        item.insertText = flag.name.slice(2);
        items.push(item);
      }
      return items;
    }

    if (position.character > 3 && line.at(position.character - 1) === '=') {
      const flagName = line.slice(0, position.character - 1).trimStart();
      const flag = this.flagData.flags.find((f) => f.name === flagName);
      if (flag?.argsValues) {
        for (const value of flag.argsValues.split('|')) {
          const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
          items.push(item);
        }
      }
      return items;
    }

    return undefined;
  }
}
