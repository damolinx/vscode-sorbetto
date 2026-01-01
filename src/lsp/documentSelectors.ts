import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { posix } from 'path';

export const SORBET_FILE_DOCUMENT_SELECTOR: Readonly<vslc.TextDocumentFilter> = {
  language: 'ruby',
  scheme: 'file',
};

export const SORBET_SCHEME = 'sorbet';

export const SORBET_SCHEME_DOCUMENT_SELECTOR: Readonly<vslc.TextDocumentFilter> = {
  language: 'ruby',
  scheme: SORBET_SCHEME,
};

export const SORBET_DOCUMENT_SELECTOR: readonly Readonly<vslc.DocumentFilter>[] = [
  SORBET_FILE_DOCUMENT_SELECTOR,
  SORBET_SCHEME_DOCUMENT_SELECTOR,
];

export function getWorkspaceDocumentSelector(
  workspaceFolder: vscode.WorkspaceFolder,
): vslc.DocumentSelector {
  const selector: vslc.DocumentSelector = [
    // TODO: `sorbet:` URIs do not have a good hint to discriminate paths per workspace
    SORBET_SCHEME_DOCUMENT_SELECTOR,
  ];

  if (workspaceFolder.uri.scheme === SORBET_FILE_DOCUMENT_SELECTOR.scheme) {
    const pattern = posix.join(workspaceFolder.uri.path, '**/*');
    selector.push({ ...SORBET_FILE_DOCUMENT_SELECTOR, pattern });
  }

  return selector;
}
