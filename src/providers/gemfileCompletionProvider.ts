import * as vscode from 'vscode';
import * as https from 'https';

export const TRIGGER_CHARACTERS: readonly string[] = ['"', "'"];

export function registerGemfileCompletionProvider(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    { pattern: '**/Gemfile' },
    new GemfileCompletionProvider(),
    ...TRIGGER_CHARACTERS
  );
}

/**
 * Completion provider for `gem` entries in Gemfile files.
 */
export class GemfileCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionList | undefined> {
    const line = document.lineAt(position).text;
    const match = line.match(/\bgem\s*(?<start>["'])(?<hint>[^"']*)(?<end>\k<start>)/d);
    if (!match || !match.groups || !match.indices?.groups) {
      return;
    }

    // Ensure cursor is inside the quotes
    const { start: [openStart], end: [_, endClose] } = match.indices.groups;
    if (position.character <= openStart || position.character >= endClose) {
      return;
    }

    const gems = await getGems(match.groups.hint || 'a');
    return new vscode.CompletionList(gems.map(gem => {
      const item = new vscode.CompletionItem(gem, vscode.CompletionItemKind.Reference);
      item.insertText = gem;
      return item;
    }), true);

    // TODO: read the `source` and map to different sources if possible.
    function getGems(hint: string): Promise<string[]> {
      return new Promise((resolve) => {
        const request = https.get(`https://rubygems.org/api/v1/search/autocomplete?query=${encodeURIComponent(hint)}`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk)
            .on('end', () => resolve(data.slice(1, -1).replace(/"/g, '').split(',')))
            .on('error', (_err) => resolve([]));
        });
        token.onCancellationRequested(() =>
          request.destroy(new Error('Request canceled'))
        );
      });
    }
  }
}