import * as vscode from 'vscode';
import { SorbetConfigFlagData } from './sorbetConfigFlagData';

export class SorbetConfigHoverProvider implements vscode.HoverProvider {
  private readonly flagData: SorbetConfigFlagData;

  constructor(flagData: SorbetConfigFlagData) {
    this.flagData = flagData;
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ) {
    const range = document.getWordRangeAtPosition(position, /--[a-zA-Z0-9-]+/);
    if (!range) {
      return;
    }

    const word = document.getText(range);
    const flag = this.flagData.flags.find((f) => f.name === word);
    if (!flag) {
      return;
    }

    const md = new vscode.MarkdownString(`\`${flag.name}\``);
    const args = flag.argsHint ?? flag.argsValues;
    if (args) {
      md.appendMarkdown(`: \`${args}\``);
    }
    md.appendMarkdown(`  \n${flag.description}`);

    return new vscode.Hover(md, range);
  }
}
