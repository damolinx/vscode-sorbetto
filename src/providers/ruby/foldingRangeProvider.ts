import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { SORBET_DOCUMENT_SELECTOR } from '../../lsp/documentSelectors';
import { HEADER_LINES_WINDOW } from './constant';

export function registerFoldingRangeProvider(context: ExtensionContext) {
  context.disposables.push(
    vscode.languages.registerFoldingRangeProvider(
      SORBET_DOCUMENT_SELECTOR,
      new FoldingRangeProvider(),
    ),
  );
}

class FoldingFrame extends vscode.FoldingRange {
  public readonly indent: number;
  constructor(start: number, end: number, indent: number) {
    super(start, end);
    this.indent = indent;
  }
}

export class FoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const ranges: vscode.FoldingRange[] = [];
    const stack: FoldingFrame[] = [];

    const { lineCount } = document;
    for (let i = 0; i < lineCount; i++) {
      const line = document.lineAt(i);

      if (line.isEmptyOrWhitespace) {
        continue;
      }

      if (FoldingRangeProvider.isLineCommentLine(line)) {
        i = consumeLineComment(i);
        continue;
      }

      if (FoldingRangeProvider.isBlockCommentStartLine(line)) {
        i = consumeBlockComment(i);
        continue;
      }

      const indent = FoldingRangeProvider.getIndent(line);
      if (indent === undefined) {
        continue;
      }

      consumeOpenRanges(indent, i);

      const start = nextNonEmptyLine(i);
      if (start < lineCount) {
        const nextIndent = FoldingRangeProvider.getIndent(document.lineAt(start));
        if (nextIndent !== undefined && nextIndent > indent) {
          stack.push(new FoldingFrame(i, i, indent));
        }
      }
    }

    return ranges;

    function consumeBlockComment(i: number): number {
      const blockComment = new vscode.FoldingRange(i, i + 1, vscode.FoldingRangeKind.Comment);
      while (blockComment.end < lineCount) {
        if (FoldingRangeProvider.isBlockCommentEndLine(document.lineAt(blockComment.end))) {
          break;
        }
        blockComment.end++;
      }
      if (blockComment.end < lineCount) {
        ranges.push(blockComment);
      }
      return blockComment.end;
    }

    function consumeLineComment(i: number): number {
      const lineComment = new vscode.FoldingRange(i, i, vscode.FoldingRangeKind.Comment);
      for (let i = lineComment.end + 1; i < lineCount; i++) {
        const line = document.lineAt(i);
        if (FoldingRangeProvider.isLineCommentLine(line)) {
          lineComment.end = i;
        } else if (!line.isEmptyOrWhitespace) {
          break;
        }
      }
      if (lineComment.end - lineComment.start) {
        ranges.push(lineComment);
      }
      return lineComment.end;
    }

    function consumeOpenRanges(indent: number, lineNumber: number): void {
      while (stack.length && indent <= stack.at(-1)!.indent) {
        const range = stack.pop()!;
        range.end = lineNumber - 1;
        if (range.end - range.start) {
          ranges.push(range);
        }
      }
    }

    function nextNonEmptyLine(i: number): number {
      let j = i + 1;
      while (j < lineCount && document.lineAt(j).isEmptyOrWhitespace) {
        j++;
      }
      return j;
    }
  }

  private static getIndent(line: vscode.TextLine): number | undefined {
    return line.isEmptyOrWhitespace ? undefined : line.firstNonWhitespaceCharacterIndex;
  }

  private static isBlockCommentEndLine({ text }: vscode.TextLine): boolean {
    return /^=end\b/.test(text);
  }

  private static isBlockCommentStartLine({ text }: vscode.TextLine): boolean {
    return /^=begin\b/.test(text);
  }

  private static isLineCommentLine(line: vscode.TextLine): boolean {
    if (line.text[line.firstNonWhitespaceCharacterIndex] !== '#') {
      return false;
    }

    if (line.lineNumber >= HEADER_LINES_WINDOW) {
      return true;
    }

    return !/^#\s*(?:!.*|(?:typed|frozen_string_literal)\s*:.*)/i.test(line.text);
  }
}
