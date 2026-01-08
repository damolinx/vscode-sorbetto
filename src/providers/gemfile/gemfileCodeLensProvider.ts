import * as vscode from 'vscode';
import { BUNDLE_INSTALL_ID, BUNDLE_UPDATE_ID } from '../../commandIds';
import { ExtensionContext } from '../../extensionContext';

export function registerGemfileCodeLensProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/Gemfile', scheme: 'file' },
      new GemfileCodeLensProvider(),
    ),
  );
}

/**
 * CodeLens actions provider for Gemfile files.
 */
export class GemfileCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const zeroRange = new vscode.Range(0, 0, 0, 0);
    const cmdArgs = [document.uri];
    return [
      new vscode.CodeLens(zeroRange, {
        arguments: cmdArgs,
        command: BUNDLE_INSTALL_ID,
        title: 'Install',
        tooltip: "Run 'bundle install' to install missing gems based on Gemfile.lock.",
      }),
      new vscode.CodeLens(zeroRange, {
        arguments: cmdArgs,
        command: BUNDLE_UPDATE_ID,
        title: 'Update',
        tooltip: "Run 'bundle update' to refresh gems based on Gemfile constraints.",
      }),
    ];
  }
}
