import { DocumentSelector } from 'vscode-languageclient';

export const SORBET_DOCUMENT_SELECTOR: DocumentSelector = [
  { language: 'ruby', scheme: 'file' },
  { language: 'ruby', scheme: 'sorbet' },
];