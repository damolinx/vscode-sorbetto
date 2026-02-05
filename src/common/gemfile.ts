import * as vscode from 'vscode';
import { GEMFILE_FILENAME, GEMFILE_LOCK_FILENAME } from '../constants';

export interface GemInfo {
  readonly name: string;
}

export class Gemfile implements vscode.Disposable {
  private cache?: GemInfo[];
  private readonly disposables: vscode.Disposable[];
  private readonly gemfile: vscode.Uri;
  private readonly gemfileLock: vscode.Uri;
  private readonly watcher: vscode.FileSystemWatcher;

  constructor({ uri }: vscode.WorkspaceFolder) {
    this.gemfile = vscode.Uri.joinPath(uri, GEMFILE_FILENAME);
    this.gemfileLock = vscode.Uri.joinPath(uri, GEMFILE_LOCK_FILENAME);
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(uri, `{${GEMFILE_LOCK_FILENAME},${GEMFILE_FILENAME}}`),
    );

    const invalidate = () => {
      this.cache = undefined;
    };

    this.watcher.onDidChange(invalidate);
    this.watcher.onDidCreate(invalidate);
    this.watcher.onDidDelete(invalidate);

    this.disposables = [
      this.watcher,
      vscode.workspace.onDidChangeTextDocument((e) => {
        if ([this.gemfile, this.gemfileLock].some((uri) => uri.fsPath === e.document.uri.fsPath)) {
          invalidate();
        }
      }),
    ];
  }

  dispose() {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  public async getGems(): Promise<GemInfo[]> {
    if (this.cache) {
      return this.cache;
    }

    let document = await vscode.workspace
      .openTextDocument(this.gemfileLock)
      .then(undefined, () => undefined);
    if (document) {
      this.cache = this.parseGemfileLock(document);
      return this.cache;
    }

    document = await vscode.workspace
      .openTextDocument(this.gemfile)
      .then(undefined, () => undefined);
    if (document) {
      this.cache = this.parseGemfile(document);
      return this.cache;
    }

    this.cache = [];
    return this.cache;
  }

  private parseGemfile(document: vscode.TextDocument): GemInfo[] {
    const gems = new Set<GemInfo>();

    for (let i = 0; i < document.lineCount; i++) {
      const { text } = document.lineAt(i);
      const match = text.match(/^\s*gem\s+(['"])([^'"]+)\1/);
      if (match) {
        gems.add({ name: match[2] });
      }
    }

    return Array.from(gems);
  }

  private parseGemfileLock(document: vscode.TextDocument): GemInfo[] {
    const gems = new Set<GemInfo>();

    for (let i = 0; i < document.lineCount; i++) {
      const { text } = document.lineAt(i);
      if (text === 'DEPENDENCIES') {
        let j = i;
        while (++j < document.lineCount) {
          const line = document.lineAt(j);
          if (line.isEmptyOrWhitespace || line.firstNonWhitespaceCharacterIndex === 0) {
            break;
          }
          const match = line.text.match(/^\s*([^\s(]+)/);
          if (!match) {
            break;
          }
          gems.add({ name: match[1] });
        }
        break;
      }
    }

    return Array.from(gems);
  }
}
