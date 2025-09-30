import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { posix } from 'path';

export const SORBET_SCHEME = 'sorbet';

export const SORBET_FILE_DOCUMENT_SELECTOR: vslc.DocumentFilter = {
  language: 'ruby',
  scheme: 'file',
} as const;

export const SORBET_DOCUMENT_SELECTOR: readonly vslc.DocumentFilter[] = [
  SORBET_FILE_DOCUMENT_SELECTOR,
  { language: 'ruby', scheme: SORBET_SCHEME } as const,
] as const;

export function getWorkspaceDocumentSelector(
  workspaceFolder: vscode.WorkspaceFolder,
): vslc.DocumentSelector {
  const pattern = posix.join(workspaceFolder.uri.path, '**/*');
  return SORBET_DOCUMENT_SELECTOR.map((s) =>
    'scheme' in s && s.scheme === workspaceFolder.uri.scheme ? { ...s, pattern } : pattern,
  );
}
