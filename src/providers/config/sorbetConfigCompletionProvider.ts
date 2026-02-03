import * as vscode from 'vscode';
import { SORBET_CONFIG_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';
import { getFlag, getFlags } from './sorbetConfigFlagData';

export const TRIGGER_CHARACTERS: readonly string[] = ['-', '='];

export function registerSorbetCompletionProvider(context: ExtensionContext) {
  context.disposables.push(
    vscode.languages.registerCompletionItemProvider(
      SORBET_CONFIG_DOCUMENT_SELECTOR,
      new SorbetConfigCompletionProvider(context),
      ...TRIGGER_CHARACTERS,
    ),
  );
}

export class SorbetConfigCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly context: ExtensionContext) {}

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ) {
    const line = document.lineAt(position).text;
    const items: vscode.CompletionItem[] = [];

    if (position.character > 1 && line.slice(position.character - 2, position.character) === '--') {
      for (const [name, { description }] of await getFlags(this.context)) {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Keyword);
        item.detail = description;
        item.insertText = name.slice(2);
        items.push(item);
      }
      return items;
    }

    if (position.character > 3 && line.at(position.character - 1) === '=') {
      const flagName = line.slice(0, position.character - 1).trimStart();
      const flag = await getFlag(this.context, flagName);
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
