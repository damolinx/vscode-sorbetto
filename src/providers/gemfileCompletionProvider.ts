import * as vscode from 'vscode';
import * as https from 'https';

export const MINIMUM_HINT_LENGTH = 1;

export function registerGemfileCompletionProvider(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    { pattern: '**/Gemfile', scheme: 'file' },
    new GemfileCompletionProvider(),
  );
}

/**
 * Completion provider for `gem` entries in Gemfile files.
 */
export class GemfileCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character + 1);
    const groups = line.match(/^\s*gem\s*(?<startQuote>['"])(?<hint>[^"']+)(?<endQuote>\1?)$/)?.groups;
    if (groups && groups.hint.length >= MINIMUM_HINT_LENGTH) {
      const suggestions = await getGems(groups.hint);
      return suggestions.map(gemName => {
        const item = new vscode.CompletionItem(gemName, vscode.CompletionItemKind.Reference);
        if (!groups.endQuote) {
          item.insertText = gemName + groups.startQuote;
        }
        return item;
      });
    }

    return;

    // TODO: read the `source` and map to different sources if possible.
    async function getGems(hint: string): Promise<string[]> {
      return new Promise((resolve) => {
        https.get(`https://rubygems.org/api/v1/search/autocomplete?query=${encodeURIComponent(hint)}`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk)
            .on('end', () => resolve(data.slice(1, -1).replace(/"/g, '').split(',')))
            .on('error', (_err) => resolve([]));
        });
      });
    }
  }
}