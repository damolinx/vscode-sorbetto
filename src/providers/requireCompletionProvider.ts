import * as vscode from 'vscode';
import { basename, dirname, extname, posix, resolve, sep } from 'path';
import { existsSync } from 'fs';

export const TRIGGER_CHARACTERS: readonly string[] = ['"', '\'', '/'];

export function registerRequireCompletionProvider(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'ruby' },
    new RequireCompletionProvider(),
    ...TRIGGER_CHARACTERS,
  );
}

/**
 * Completion provider for `require_relative` entries.
 */
export class RequireCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character + 1);

    const groups = line.match(/^\s*require_relative\s*(?<startQuote>['"])(?<path>[^"']*)(?<endQuote>\1?)(?!\s|;|$)/)?.groups;
    if (!groups) {
      return;
    }

    const documentDirPath = dirname(document.fileName);
    const hintPath = determineHintPath(documentDirPath, groups.path);
    if (!hintPath) {
      return;
    }

    const suggestions = await getPaths(documentDirPath, hintPath.path);
    if (suggestions.length === 0) {
      return;
    }

    return suggestions.map(([path, type]) => {
      const item = new vscode.CompletionItem(path, type);
      item.insertText = path.substring(hintPath.path.length);
      item.commitCharacters = [groups.startQuote];
      if (type === vscode.CompletionItemKind.Folder) {
        item.commitCharacters.push('/');
      }
      return item;
    });

    function determineHintPath(baseDir: string, initialHint: string): { path: string; filter?: string; } | undefined {
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

    async function getPaths(baseDir: string, hintPath: string): Promise<[string, vscode.CompletionItemKind][]> {
      const resolvedHintPath = resolve(baseDir, normalizeToRequire(hintPath));
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(resolvedHintPath));
      if (!hintPath) {
        entries.unshift(['..', vscode.FileType.Directory]);
      }
      return entries
        .map(([path, type]) => {
          let result: [string, vscode.CompletionItemKind] | undefined;
          if (type === vscode.FileType.Directory) {
            result = [posix.join(hintPath, path), vscode.CompletionItemKind.Folder];
          } else if (extname(path) === '.rb') {
            result = [posix.join(hintPath, basename(path, '.rb')), vscode.CompletionItemKind.File];
          }
          return result;
        })
        .filter((e) => e !== undefined);

      function normalizeToRequire(path: string): string {
        return (sep !== '/') ? path.replaceAll(sep, '/') : path;
      }
    }
  }
}
