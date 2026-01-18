import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { SORBET_DOCUMENT_SELECTOR } from '../../lsp/documentSelectors';

export function registerFoldingRangeProvider(context: ExtensionContext) {
  context.disposables.push(
    vscode.languages.registerFoldingRangeProvider(
      SORBET_DOCUMENT_SELECTOR,
      new FoldingRangeProvider(),
    ),
  );
}

export class FoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken,
  ): vscode.FoldingRange[] | undefined {
    const lineCount = document.lineCount;
    if (lineCount < 2) {
      return;
    }

    const foldingRanges: vscode.FoldingRange[] = [];

    let commentStart: undefined | number;
    for (let i = 0; i < lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.startsWith('#', line.firstNonWhitespaceCharacterIndex)) {
        commentStart ??= i;
      } else if (commentStart !== undefined && !line.isEmptyOrWhitespace) {
        if (i - commentStart > 1) {
          foldingRanges.push(
            new vscode.FoldingRange(commentStart, i - 1, vscode.FoldingRangeKind.Comment),
          );
        }
        commentStart = undefined;
      }
    }

    if (commentStart && lineCount - commentStart > 1) {
      foldingRanges.push(
        new vscode.FoldingRange(commentStart, lineCount - 1, vscode.FoldingRangeKind.Comment),
      );
    }

    return foldingRanges;
  }
}
