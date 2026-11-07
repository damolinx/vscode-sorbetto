import * as vscode from 'vscode';
import { Gemfile } from '../../common/gemfile';
import { RUBY_FILE_DOCUMENT_SELECTOR } from '../../constants';
import { ExtensionContext } from '../../extensionContext';

export const TRIGGER_CHARACTERS: readonly string[] = ['"', "'"];

export function registerRequireCompletionProvider({ disposables }: ExtensionContext): void {
  const provider = new RequireCompletionProvider();
  disposables.push(
    provider,
    vscode.languages.registerCompletionItemProvider(
      RUBY_FILE_DOCUMENT_SELECTOR,
      provider,
      ...TRIGGER_CHARACTERS,
    ),
  );
}

/**
 * Completion provider for `require` entries.
 */
export class RequireCompletionProvider implements vscode.CompletionItemProvider, vscode.Disposable {
  private readonly gemfileCache: Map<string, Gemfile>;

  constructor() {
    this.gemfileCache = new Map();
  }

  public dispose(): void {
    for (const gemfile of this.gemfileCache.values()) {
      gemfile.dispose();
    }
    this.gemfileCache.clear();
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    const line = document.lineAt(position).text.substring(0, position.character);

    const match = line.match(/^\s*require\s*['"](?<gem>(?:[^"']+|$))/);
    if (!match?.groups) {
      return;
    }

    const gemfile = this.getGemfileFor(document);
    if (!gemfile) {
      return;
    }

    const gems = await gemfile.getGems();
    return gems.map(
      ({ name }) => new vscode.CompletionItem(name, vscode.CompletionItemKind.Module),
    );
  }

  private getGemfileFor(document: vscode.TextDocument): Gemfile | undefined {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return;
    }
    let gemfile = this.gemfileCache.get(workspaceFolder.uri.fsPath);
    if (!gemfile) {
      gemfile = new Gemfile(workspaceFolder);
      this.gemfileCache.set(workspaceFolder.uri.fsPath, gemfile);
    }
    return gemfile;
  }
}
