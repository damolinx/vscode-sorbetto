import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { SORBET_CONFIG_DOCUMENT_SELECTOR } from '../../lsp/documentSelectors';
import { getFlag } from './sorbetConfigFlagData';

export function registerSorbetConfigHoverProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.languages.registerHoverProvider(
      SORBET_CONFIG_DOCUMENT_SELECTOR,
      new SorbetConfigHoverProvider(context),
    ),
  );
}

export class SorbetConfigHoverProvider implements vscode.HoverProvider {
  constructor(private readonly context: ExtensionContext) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    const range = document.getWordRangeAtPosition(position, /--[a-zA-Z0-9-]+/);
    if (!range) {
      return;
    }

    const word = document.getText(range);
    const flag = await getFlag(this.context, word);
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
