import * as vscode from 'vscode';

export const EXTENSION_PREFIX = 'sorbetto';

export const GEMFILE_FILENAME = 'Gemfile';

export const GEMFILE_LOCK_FILENAME = 'Gemfile.lock';

export const PACKAGE_FILENAME = '__package.rb';

export const SORBET_CONFIG_DOCUMENT_SELECTOR: Readonly<vscode.DocumentFilter> = {
  language: 'sorbet-config',
};

export const SORBET_FILE_DOCUMENT_SELECTOR: Readonly<vscode.DocumentFilter> = {
  language: 'ruby',
  scheme: 'file',
};

export const SORBET_SCHEME = 'sorbet';

export const SORBET_SCHEME_DOCUMENT_SELECTOR: Readonly<vscode.DocumentFilter> = {
  language: 'ruby',
  scheme: SORBET_SCHEME,
};

export const SORBET_DOCUMENT_SELECTOR: readonly vscode.DocumentFilter[] = [
  SORBET_FILE_DOCUMENT_SELECTOR,
  SORBET_SCHEME_DOCUMENT_SELECTOR,
];
