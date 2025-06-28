import { DocumentSelector } from 'vscode-languageclient';

export const SORBET_SCHEME = 'sorbet';

export const SORBET_DOCUMENT_SELECTOR: DocumentSelector = [
  { language: 'ruby', scheme: 'file' },
  { language: 'ruby', scheme: SORBET_SCHEME },
];