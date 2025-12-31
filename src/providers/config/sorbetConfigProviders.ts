import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import {
  SorbetConfigCompletionProvider,
  TRIGGER_CHARACTERS,
} from './sorbetConfigCompletionProvider';
import { loadFlagData, SorbetConfigFlagData } from './sorbetConfigFlagData';
import { SorbetConfigHoverProvider } from './sorbetConfigHoverProvider';

export function registerSorbetConfigProviders(context: ExtensionContext): void {
  const flagData = loadFlagData(context);
  registerSorbetCompletionProvider(context, flagData);
  registerSorbetConfigHoverProvider(context, flagData);
}

function registerSorbetCompletionProvider(
  { disposables }: ExtensionContext,
  flagData: SorbetConfigFlagData,
) {
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'sorbet-config' },
      new SorbetConfigCompletionProvider(flagData),
      ...TRIGGER_CHARACTERS,
    ),
  );
}

function registerSorbetConfigHoverProvider(
  { disposables }: ExtensionContext,
  flagData: SorbetConfigFlagData,
): void {
  disposables.push(
    vscode.languages.registerHoverProvider(
      { language: 'sorbet-config' },
      new SorbetConfigHoverProvider(flagData),
    ),
  );
}
