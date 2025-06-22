import * as vscode from 'vscode';

export const TRIGGER_CHARACTERS: readonly string[] = [':'];

export function registerTypedOptionsCompletionProvider(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'ruby' },
    new TypedOptionsCompletionProvider(),
    ...TRIGGER_CHARACTERS,
  );
}

/**
 * Provide autocompletion for `typed` options.
 */
export class TypedOptionsCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character);

    if (TRIGGER_CHARACTERS.some((c) => c === context.triggerCharacter) || context.triggerKind == vscode.CompletionTriggerKind.Invoke) {
      if (/^\s*#\s*typed:/.test(line)) {
        return ([
          ['ignore', new vscode.MarkdownString('Sorbet completely ignores file.')],
          ['false', new vscode.MarkdownString('Sorbet only reports errors related to syntax, constant resolution and `sig`s.')],
          ['true', new vscode.MarkdownString('Sorbet reports type error in addition to `false`-level rules.')],
          ['strict', new vscode.MarkdownString('Sorbet requires all methods to have `sig`s in addition to `true`-level rules.')],
          ['strong', new vscode.MarkdownString('Sorbet no longer allows `T.untyped`  in addition to `strict`-level rules.')],
        ] as [string, vscode.MarkdownString][]).map(([name, documentation]) => {
          const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);
          item.documentation = documentation;
          return item;
        });
      }
    }

    return;
  }
}