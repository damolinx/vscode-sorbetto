import * as vscode from 'vscode';
import { RUBY_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';
import { HEADER_LINES_WINDOW, RUBY_TYPED_DIRECTIVES_HELP, RubyTypedDirective } from './constants';

export function registerTypedOptionsHoverProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.languages.registerHoverProvider(
      RUBY_FILE_DOCUMENT_SELECTOR,
      new TypedOptionsHoverProvider(),
    ),
  );
}

export class TypedOptionsHoverProvider implements vscode.HoverProvider {
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    if (position.line >= HEADER_LINES_WINDOW) {
      return;
    }

    const { text } = document.lineAt(position);
    const match = text.match(/^\s*#\s*typed:\s*(?<directive>[a-z]+)\b/);
    if (!match?.groups) {
      return;
    }

    const directive = match.groups.directive;
    if (!(directive in RUBY_TYPED_DIRECTIVES_HELP)) {
      return;
    }

    return new vscode.Hover(
      RUBY_TYPED_DIRECTIVES_HELP[directive as RubyTypedDirective],
      document.getWordRangeAtPosition(position),
    );
  }
}
