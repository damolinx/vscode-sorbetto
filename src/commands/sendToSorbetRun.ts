import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';

export async function sendToSorbetRun(
  { log }: ExtensionContext,
  { document, selection }: vscode.TextEditor,
): Promise<void> {
  const content = document.getText(selection).trim();
  if (!content) {
    log.warn('SendToSorbetRun: Cannot send empty selection');
    vscode.window.showWarningMessage('Cannot send an empty selection');
    return;
  }

  if (content.length > 1024 * 1024) {
    log.warn('SendToSorbetRun: Cannot send more than 1MB', content.length);
    vscode.window.showWarningMessage('Cannot send more than 1MB');
    return;
  }

  const uri = vscode.Uri.from({ authority: 'sorbet.run', scheme: 'https', fragment: content });
  await vscode.env.openExternal(uri);
}
