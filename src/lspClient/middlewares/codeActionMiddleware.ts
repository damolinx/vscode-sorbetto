import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { CommandIds } from '../../commandIds';

/**
 * Sorbet specifically requires this command Id which leads to compatibility
 * complexities when multiple extensions want to host Sorbet as they need to
 * offer the command. To workaround this, this middleware remaps the command
 * to extension-owned command.
 * https://sorbet.org/docs/lsp#sorbetsavepackagefiles-command
 */
const SORBET_SAVE_PACKAGE_FILES = 'sorbet.savePackageFiles';

export const CodeActionMiddleware: vslc.CodeActionMiddleware = {
  provideCodeActions: async (
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
    next: vslc.ProvideCodeActionsSignature,
  ): Promise<(vscode.Command | vscode.CodeAction)[] | undefined | null> => {
    const actions = (await next(document, range, context, token)) ?? [];
    actions.forEach(({ command }) => {
      if (command && typeof command === 'object' && command.command === SORBET_SAVE_PACKAGE_FILES) {
        command.command = CommandIds.SavePackageFiles;
      }
    });

    const diagnostic = context.diagnostics.find(
      (d) =>
        (typeof d.code === 'object' ? d.code.value : d.code) === 3705 && d.range.isEqual(range),
    );
    if (diagnostic) {
      const action = new vscode.CodeAction('Create a package file', vscode.CodeActionKind.QuickFix);
      action.command = {
        title: action.title,
        command: CommandIds.CreatePackage,
        arguments: [document.uri],
      };
      action.diagnostics = [diagnostic];
      actions.push(action);
    }

    return actions;
  },
  resolveCodeAction: (
    item: vscode.CodeAction,
    token: vscode.CancellationToken,
    next: vslc.ResolveCodeActionSignature,
  ): vscode.ProviderResult<vscode.CodeAction> => {
    const commandId = item.command?.command;
    if (commandId && [CommandIds.OpenPackage].some((id) => id === commandId)) {
      return item;
    }

    return next(item, token);
  },
} as const;
