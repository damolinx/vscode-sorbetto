import * as vscode from 'vscode';
import { posix } from 'path';
import { uriEquals, uriExists } from '../../common/workspaceUtils';
import { PACKAGE_FILENAME, SORBET_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';

export const TRIGGER_CHARACTERS: readonly string[] = ['"', "'", posix.sep];

export function registerRequireRelativeCompletionProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      SORBET_FILE_DOCUMENT_SELECTOR,
      new RequireRelativeCompletionProvider(),
      ...TRIGGER_CHARACTERS,
    ),
  );
}

/**
 * Completion provider for `require_relative` entries.
 */
export class RequireRelativeCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character);

    const match = line.match(/^\s*require_relative\s*(?<startQuote>['"])(?<path>[^'"]*)/d);
    if (!match?.groups || !match.indices) {
      return;
    }

    const documentDir = vscode.Uri.joinPath(document.uri, '..');
    const hintPath = await determineHintPath(documentDir, match.groups.path);
    if (!hintPath) {
      return;
    }

    const suggestions = await getPaths(documentDir, hintPath.path);
    if (suggestions.length === 0) {
      return;
    }

    const [start, end] = match.indices.groups!.path;
    const replaceRange = match.groups.path.length
      ? new vscode.Range(position.line, start, position.line, end)
      : undefined;

    const dirCommitChars = [match.groups!.startQuote, posix.sep];
    const fileCommitChars = [match.groups!.startQuote];
    return suggestions.map(([suggestionPath, type]) => {
      const item = new vscode.CompletionItem(posix.basename(suggestionPath), type);
      item.filterText = hintPath.path + suggestionPath;
      item.range = replaceRange;

      if (type === vscode.CompletionItemKind.Folder) {
        item.commitCharacters = dirCommitChars;
        item.insertText = suggestionPath;
        item.sortText = '0';
      } else {
        item.commitCharacters = fileCommitChars;
        item.documentation = suggestionPath;
        item.insertText = posix.join(hintPath.path, posix.basename(suggestionPath, '.rb'));
        item.sortText = '1';
      }

      return item;
    });

    async function determineHintPath(
      baseDir: vscode.Uri,
      initialHint: string,
    ): Promise<{ path: string; filter?: string } | undefined> {
      const resolvedHintUri = vscode.Uri.joinPath(baseDir, initialHint);
      if (await uriExists(resolvedHintUri)) {
        return { path: initialHint };
      }

      const resolvedHintDirUri = vscode.Uri.joinPath(resolvedHintUri, '..');
      if (await uriExists(resolvedHintDirUri, vscode.FileType.Directory)) {
        return { path: `${posix.dirname(initialHint)}/`, filter: posix.basename(initialHint) };
      }

      return undefined;
    }

    async function getPaths(
      baseDir: vscode.Uri,
      hintPath: string,
    ): Promise<[string, vscode.CompletionItemKind][]> {
      const resolvedHintUri = vscode.Uri.joinPath(baseDir, hintPath);
      let entries = await vscode.workspace.fs.readDirectory(resolvedHintUri);
      if (uriEquals(baseDir, resolvedHintUri)) {
        const selfName = posix.basename(document.uri.path);
        entries = entries.filter(([name]) => name !== selfName);
      }

      const paths = entries
        .map(([path, type]) => {
          let result: [string, vscode.CompletionItemKind] | undefined;
          if (!path.startsWith('.')) {
            if (type & vscode.FileType.Directory) {
              result = [posix.join(hintPath, path), vscode.CompletionItemKind.Folder];
            } else if (type & vscode.FileType.File) {
              if (path.endsWith('.rb') && path !== PACKAGE_FILENAME) {
                result = [posix.join(hintPath, path), vscode.CompletionItemKind.File];
              }
            }
          }
          return result;
        })
        .filter((e) => e !== undefined);

      return paths;
    }
  }
}
