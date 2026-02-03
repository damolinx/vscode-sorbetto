import * as vscode from 'vscode';
import { SORBET_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';
import { HEADER_LINES_WINDOW } from './constants';

export const TRIGGER_CHARACTERS: readonly string[] = [':'];

export function registerTypedOptionsCompletionProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      SORBET_FILE_DOCUMENT_SELECTOR,
      new TypedOptionsCompletionProvider(),
      ...TRIGGER_CHARACTERS,
    ),
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
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionList | undefined> {
    if (position.line >= HEADER_LINES_WINDOW) {
      return;
    }

    const line = document.lineAt(position).text.substring(0, position.character);
    const match = line.match(/^\s*#\s*typed:(?<directive>\s*[a-z]*)$/d);
    if (!match?.indices?.groups) {
      return;
    }

    const replaceRange = new vscode.Range(
      position.line,
      match.indices.groups.directive[0],
      position.line,
      position.character,
    );

    return new vscode.CompletionList(
      (
        [
          ['ignore', new vscode.MarkdownString('Sorbet completely ignores file.')],
          [
            'false',
            new vscode.MarkdownString(
              'Sorbet only reports errors related to syntax, constant resolution and `sig`s.',
            ),
          ],
          [
            'true',
            new vscode.MarkdownString(
              'Sorbet reports type error in addition to `false`-level rules.',
            ),
          ],
          [
            'strict',
            new vscode.MarkdownString(
              'Sorbet requires all methods to have `sig`s in addition to `true`-level rules.',
            ),
          ],
          [
            'strong',
            new vscode.MarkdownString(
              'Sorbet no longer allows `T.untyped` in addition to `strict`-level rules.',
            ),
          ],
        ] as [string, vscode.MarkdownString][]
      ).map(([name, documentation]) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);
        item.documentation = documentation;
        item.insertText = ` ${name}`;
        item.range = replaceRange;
        return item;
      }),
    );
  }
}
