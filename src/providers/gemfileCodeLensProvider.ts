import * as vscode from 'vscode';
import { BUNDLE_INSTALL_ID } from '../commandIds';

export function registerGemfileCodeLensProvider(): vscode.Disposable {
  return vscode.languages.registerCodeLensProvider(
    { pattern: '**/Gemfile', scheme: 'file' },
    new GemfileCodeLensProvider(),
  );
}

/**
 * CodeLens actions provider for Gemfile files.
 */
export class GemfileCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] {
    const bundleInstallCodeLens = new vscode.CodeLens(
      new vscode.Range(0, 0, 0, 0), {
      arguments: [document.uri],
      command: BUNDLE_INSTALL_ID,
      title: 'Install',
      tooltip: 'Run \'bundle install\'',
    });
    return [bundleInstallCodeLens];
  }
}