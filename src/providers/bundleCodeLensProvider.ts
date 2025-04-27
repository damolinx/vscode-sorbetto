import { CancellationToken, CodeLens, CodeLensProvider, DocumentFilter, Range, TextDocument } from 'vscode';
import { BUNDLE_INSTALL_ID } from '../commandIds';

export const GEMFILE_SELECTOR: DocumentFilter[] = [
  { pattern: '**/Gemfile', scheme: 'file' },
];

export class BundleCodeLensProvider implements CodeLensProvider {
  provideCodeLenses(document: TextDocument, _token: CancellationToken): CodeLens[] {
    const bundleCodeLens = new CodeLens(
      new Range(0, 0, 0, 0), {
      arguments: [document.uri],
      command: BUNDLE_INSTALL_ID,
      title: 'Install',
      tooltip: 'Run \'bundle install\'',
    });
    return [bundleCodeLens];
  }
}