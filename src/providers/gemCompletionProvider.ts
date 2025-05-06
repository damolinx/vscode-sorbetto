import * as vscode from 'vscode';
import * as https from 'https';

export const GEMFILE_SELECTOR: vscode.DocumentSelector = { scheme: 'file', pattern: '**/Gemfile' };
const MINIMUM_HINT_LENGTH = 1;

/**
 * Provide autocompletion for `gem` values.
 */
export class GemCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character);
    const hint = line.match(/^\s*gem\s*(['"])(?<hint>[^"']+)\1?$/)?.groups?.hint;
    if (hint && hint.length >= MINIMUM_HINT_LENGTH) {
      const suggestions = await getGems(hint);
      return suggestions.map(gemName => new vscode.CompletionItem(gemName, vscode.CompletionItemKind.Reference));
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