import * as vscode from 'vscode';
import { CommandIds } from '../../commandIds';
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
    { uri }: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const zeroRange = new vscode.Range(0, 0, 0, 0);
    const cmdArgs = [uri];
    return [
      new vscode.CodeLens(zeroRange, {
        arguments: cmdArgs,
        command: CommandIds.BundleInstall,
        title: 'Install',
        tooltip: "Run 'bundle install' to install missing gems based on Gemfile.lock.",
      }),
      new vscode.CodeLens(zeroRange, {
        arguments: cmdArgs,
        command: CommandIds.BundleUpdate,
        title: 'Update',
        tooltip: "Run 'bundle update' to refresh gems based on Gemfile constraints.",
      }),
    ];
  }
}
