import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { GemfileCodeLensProvider } from './gemfileCodeLensProvider';
import { GemfileCompletionProvider, TRIGGER_CHARACTERS } from './gemfileCompletionProvider';

export function registerGemfileProviders(context: ExtensionContext): void {
  registerGemfileCodeLensProvider(context);
  registerGemfileCompletionProvider(context);
}

function registerGemfileCodeLensProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/Gemfile', scheme: 'file' },
      new GemfileCodeLensProvider(),
    ),
  );
}

function registerGemfileCompletionProvider({ disposables }: ExtensionContext): void {
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      { pattern: '**/Gemfile' },
      new GemfileCompletionProvider(),
      ...TRIGGER_CHARACTERS,
    ),
  );
}
