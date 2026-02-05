import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { basename, dirname, extname, posix, resolve, sep } from 'path';
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

    const match = line.match(/^\s*require_relative\s*(?<startQuote>['"])(?<path>(?:[^"']+|$))/d);
    if (!match?.groups || !match?.indices) {
      return;
    }

    const documentDirPath = dirname(document.fileName);
    const hintPath = determineHintPath(documentDirPath, match.groups.path);
    if (!hintPath) {
      return;
    }

    const suggestions = await getPaths(documentDirPath, hintPath.path);
    if (suggestions.length === 0) {
      return;
    }

    const [start, end] = match.indices.groups!.path;
    const replaceRange = match.groups.path.length
      ? new vscode.Range(position.line, start, position.line, end)
      : undefined;

    const dirCommitChars = [match.groups!.startQuote, posix.sep];
    const fileCommitChars = [match.groups!.startQuote];
    return suggestions.map(([path, type]) => {
      const item = new vscode.CompletionItem(path, type);
      item.range = replaceRange;

      if (type === vscode.CompletionItemKind.Folder) {
        item.commitCharacters = dirCommitChars;
        item.insertText = path;
        item.sortText = '0';
      } else {
        item.commitCharacters = fileCommitChars;
        item.insertText = posix.join(hintPath.path, basename(path, '.rb'));
        item.sortText = '1';
      }

      return item;
    });

    function determineHintPath(
      baseDir: string,
      initialHint: string,
    ): { path: string; filter?: string } | undefined {
      let testPath = resolve(baseDir, initialHint);
      if (existsSync(testPath)) {
        return { path: initialHint };
      }

      const initialHintDir = dirname(initialHint);
      testPath = resolve(baseDir, initialHintDir);
      if (existsSync(testPath)) {
        return { path: `${initialHintDir}/`, filter: basename(initialHint) };
      }

      return undefined;
    }

    async function getPaths(
      baseDir: string,
      hintPath: string,
    ): Promise<[string, vscode.CompletionItemKind][]> {
      const resolvedHintPath = resolve(baseDir, normalizeToRequire(hintPath));
      let entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(resolvedHintPath));
      if (baseDir === resolvedHintPath) {
        const selfName = basename(document.fileName);
        entries = entries.filter((entry) => entry[0] !== selfName);
      }
      const paths = entries
        .map(([path, type]) => {
          let result: [string, vscode.CompletionItemKind] | undefined;
          if (!path.startsWith('.')) {
            if (type === vscode.FileType.Directory) {
              result = [posix.join(hintPath, path), vscode.CompletionItemKind.Folder];
            } else if (extname(path) === '.rb' && !path.endsWith(PACKAGE_FILENAME)) {
              result = [posix.join(hintPath, path), vscode.CompletionItemKind.File];
            }
          }
          return result;
        })
        .filter((e) => e !== undefined);

      paths.unshift(['..', vscode.CompletionItemKind.Folder]);
      return paths;

      function normalizeToRequire(path: string): string {
        return sep !== posix.sep ? path.replaceAll(sep, posix.sep) : path;
      }
    }
  }
}
