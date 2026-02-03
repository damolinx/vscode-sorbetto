import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { posix } from 'path';

const SORBET_FILE_DOCUMENT_FILTER: Readonly<vslc.TextDocumentFilter> = {
  language: 'ruby',
  scheme: 'file',
};

const SORBET_SCHEME_DOCUMENT_FILTER: Readonly<vslc.TextDocumentFilter> = {
  language: 'ruby',
  scheme: 'sorbet',
};

export function getWorkspaceDocumentSelector(
  workspaceFolder: vscode.WorkspaceFolder,
): vslc.DocumentSelector {
  const selector: vslc.DocumentSelector = [
    // TODO: `sorbet:` URIs do not have a good hint to discriminate paths per workspace
    SORBET_SCHEME_DOCUMENT_FILTER,
  ];

  if (workspaceFolder.uri.scheme === SORBET_FILE_DOCUMENT_FILTER.scheme) {
    const pattern = posix.join(workspaceFolder.uri.path, '**/*');
    selector.push({ ...SORBET_FILE_DOCUMENT_FILTER, pattern });
  }

  return selector;
}
