import * as vscode from 'vscode';
import { RUBY_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';
import { HEADER_LINES_WINDOW, RUBY_TYPED_DIRECTIVES_HELP, RubyTypedDirective } from './constants';

export const TRIGGER_CHARACTERS: readonly string[] = [':'];

export function registerTypedOptionsCompletionProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      RUBY_FILE_DOCUMENT_SELECTOR,
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
      (['ignore', 'false', 'true', 'strict', 'strong'] as RubyTypedDirective[]).map((name) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);
        item.documentation = RUBY_TYPED_DIRECTIVES_HELP[name];
        item.insertText = ` ${name}`;
        item.range = replaceRange;
        return item;
      }),
    );
  }
}
