import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { SORBET_DOCUMENT_SELECTOR } from '../lsp/documentSelectors';

export function registerSelectionRangeProvider(context: ExtensionContext) {
  context.disposables.push(
    vscode.languages.registerSelectionRangeProvider(
      SORBET_DOCUMENT_SELECTOR,
      new SelectionRangeProvider(),
    ),
  );
}

export class SelectionRangeProvider implements vscode.SelectionRangeProvider {
  async provideSelectionRanges(
    document: vscode.TextDocument,
    positions: vscode.Position[],
    _token: vscode.CancellationToken,
  ): Promise<vscode.SelectionRange[] | undefined> {
    const foldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[] | undefined>(
      'vscode.executeFoldingRangeProvider',
      document.uri,
    );
    return positions.map((position) =>
      this.buildSelectionRangeChain(document, position, foldingRanges ?? []),
    );
  }

  private buildSelectionRangeChain(
    document: vscode.TextDocument,
    position: vscode.Position,
    foldingRanges: vscode.FoldingRange[],
  ): vscode.SelectionRange {
    let currentSelectionRange: vscode.SelectionRange | undefined;

    // Filter and sort to build selection tree outer to inner.
    for (const range of foldingRanges
      .map((fr) => new vscode.Range(fr.start, 0, fr.end, Number.MAX_SAFE_INTEGER))
      .filter((r) => r.contains(position))
      .sort((a, b) => a.start.line - b.start.line)) {
      currentSelectionRange = new vscode.SelectionRange(
        this.extendAsNeeded(document, range),
        currentSelectionRange,
      );
    }

    // By default, current word and line are part of the expansion, but the definition
    // of word is too restrictive for so this heuristic expands on it to account for
    // Ruby consts and strings. The approach also enables looking back safely.
    const wordRange = document.getWordRangeAtPosition(
      position,
      /(?:[A-Z][A-Za-z0-9_]*(?:::[A-Z][A-Za-z0-9_]*)*|"[^"]*"|'[^']*')/,
    );
    if (wordRange) {
      currentSelectionRange = new vscode.SelectionRange(wordRange, currentSelectionRange);
    }

    return currentSelectionRange ?? new vscode.SelectionRange(new vscode.Range(position, position));
  }

  private extendAsNeeded(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
    const line = document.lineAt(range.start.line);
    const { firstNonWhitespaceCharacterIndex, text } = line;

    const expand = ['class ', 'def ', 'module ', 'sig '].some((prefix) =>
      text.startsWith(prefix, firstNonWhitespaceCharacterIndex),
    );
    if (!expand) {
      return range;
    }

    const nextLine = range.end.line + 1;
    if (nextLine >= document.lineCount) {
      return range;
    }

    return new vscode.Range(range.start, document.lineAt(nextLine).range.end);
  }
}
