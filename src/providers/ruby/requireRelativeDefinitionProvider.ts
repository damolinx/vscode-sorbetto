import * as vscode from 'vscode';
// import * as path from 'path';
import { RUBY_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';

export function registerRequireRelativeDefinitionProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerDefinitionProvider(
      RUBY_FILE_DOCUMENT_SELECTOR,
      new RequireRelativeDefinitionProvider(),
    ),
  );
}

export class RequireRelativeDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.Definition | undefined {
    let link: vscode.Location | undefined;

    const line = document.lineAt(position);
    const regex = /(?:^|\s+)require_relative\s*(['"])(?<path>[^"']*)\1/dg;
    const baseDir = vscode.Uri.joinPath(document.uri, '..');

    let match: RegExpMatchArray | null;
    while ((match = regex.exec(line.text)) && !link && !token.isCancellationRequested) {
      const [start, end] = match.indices!.at(2)!;
      if (position.character >= start && position.character <= end) {
        const target = vscode.Uri.joinPath(baseDir, match.groups!.path + '.rb');
        link = new vscode.Location(target, new vscode.Range(0, 0, 0, 0));
      }
    }

    return link;
  }
}
