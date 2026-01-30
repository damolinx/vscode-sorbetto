import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { SORBET_FILE_DOCUMENT_SELECTOR } from '../../lsp/documentSelectors';
import { HEADER_LINES_WINDOW } from './constant';

export function registerTypedOptionsHoverProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.languages.registerHoverProvider(
      SORBET_FILE_DOCUMENT_SELECTOR,
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

    const hoverValue = this.getDirectiveHelp(match.groups!.directive);
    if (!hoverValue) {
      return;
    }

    return new vscode.Hover(
      new vscode.MarkdownString(hoverValue),
      document.getWordRangeAtPosition(position),
    );
  }

  private getDirectiveHelp(directive: string): string | undefined {
    switch (directive) {
      case 'ignore':
        return 'This file is not typechecked.';
      case 'false':
        return 'This file is parsed, but typechecking is disabled.';
      case 'true':
        return 'This file is typechecked with basic rules; signatures are optional.';
      case 'strict':
        return 'This file is fully typechecked; method signatures are required.';
      case 'strong':
        return 'This file is fully typechecked with stricter rules; `T.untyped` is not allowed.';
      default:
        return; // Sorbet will surface its own message for unknown values
    }
  }
}
