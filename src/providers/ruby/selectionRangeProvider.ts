import * as vscode from 'vscode';
import { SORBET_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';

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

    const selectionRanges = positions.map((position) =>
      this.buildSelectionRangeChain(document, position, foldingRanges ?? []),
    );
    return selectionRanges;
  }

  private buildSelectionRangeChain(
    document: vscode.TextDocument,
    position: vscode.Position,
    foldingRanges: vscode.FoldingRange[],
  ): vscode.SelectionRange {
    let current: vscode.SelectionRange | undefined;

    for (const { start, end } of foldingRanges) {
      if (start <= position.line && end >= position.line) {
        const { start: startLineStart } = document.lineAt(start).range;
        const { end: endLineEnd } = document.lineAt(end).range;
        const range = new vscode.Range(startLineStart, endLineEnd);
        current = new vscode.SelectionRange(this.expandRange(document, range), current);
      }
    }

    [
      /\[.*\]|\(.*\)|{.*}|do\s+.*end/, // blocks
      /"[^"]*"|'[^']*'/, // strings
      /[A-Z][A-Za-z0-9_]*(?:::[A-Z][A-Za-z0-9_]*)*/, // constants
    ].forEach((regex) => {
      const range = document.getWordRangeAtPosition(position, regex);
      if (range) {
        current = new vscode.SelectionRange(range, current);
      }
    });

    return current ?? new vscode.SelectionRange(new vscode.Range(position, position));
  }

  private expandRange(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
    const extendedEnd = range.end.translate(1);
    if (extendedEnd.line > document.lineCount) {
      return range;
    }

    const { text, firstNonWhitespaceCharacterIndex } = document.lineAt(extendedEnd);
    const expand = text.startsWith('end', firstNonWhitespaceCharacterIndex);
    if (!expand) {
      return range;
    }

    return new vscode.Range(range.start, extendedEnd);
  }
}
