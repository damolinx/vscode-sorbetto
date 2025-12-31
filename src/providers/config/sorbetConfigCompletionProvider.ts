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

    // Case 3: Value on next line
    const prevLine = position.line > 0 ? document.lineAt(position.line - 1).text.trim() : '';

    const prevFlag = this.flagData.flags.find((f) => prevLine.startsWith(f.name));
    if (prevFlag?.argsHint) {
      const values = prevFlag.argsHint.split('|');
      for (const v of values) {
        const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Value);
        item.detail = `Value for ${prevFlag.name}`;
        items.push(item);
      }
      return items;
    }

    return undefined;
  }
}
