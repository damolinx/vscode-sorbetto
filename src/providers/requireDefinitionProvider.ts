import * as vscode from 'vscode';
import * as path from 'path';
import { SORBET_FILE_DOCUMENT_SELECTOR } from '../lsp/constants';

export function registerRequireDefinitionProvider(): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    SORBET_FILE_DOCUMENT_SELECTOR,
    new RequireDefinitionProvider(),
  );
}

export class RequireDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.Definition | undefined {
    let link: vscode.Location | undefined;

    const line = document.lineAt(position);
    const regex = /(?:^|\s+)require_relative\s*(['"])(?<path>[^"']*)\1/dg;

    let match: RegExpMatchArray | null;
    while ((match = regex.exec(line.text)) && !link && !token.isCancellationRequested) {
      const [start, end] = match.indices!.at(2)!;
      if (position.character >= start && position.character <= end) {
        const baseDir = path.dirname(document.fileName);
        const target = vscode.Uri.file(path.resolve(baseDir, match.groups!.path + '.rb'));
        link = new vscode.Location(target, new vscode.Range(0, 0, 0, 0));
      }
    }

    return link;
  }
}
