import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { CommandIds } from '../../commandIds';
import { groupDiagnosticsByCode } from '../../common/diagnostics';

/**
 * Sorbet specifically requires this command Id which leads to compatibility
 * complexities when multiple extensions want to host Sorbet as they need to
 * offer the command. To workaround this, this middleware remaps the command
 * to an extension-owned command.
 * See https://sorbet.org/docs/lsp#sorbetsavepackagefiles-command
 */
const SORBET_SAVE_PACKAGE_FILES = 'sorbet.savePackageFiles';

const CUSTOM_CODEACTION_COMMANDS = [
  CommandIds.CreatePackage,
  CommandIds.ApplyImportExportFixes,
] as readonly string[];

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

    const diagsByCode = groupDiagnosticsByCode(context.diagnostics, 3705, 3718);
    const diags3705 = diagsByCode[3705];
    if (diags3705) {
      const action = new vscode.CodeAction('Create a package file', vscode.CodeActionKind.QuickFix);
      action.command = {
        title: action.title,
        command: CommandIds.CreatePackage,
        arguments: [document.uri],
      };
      action.diagnostics = diags3705;
      actions.push(action);
    }

    const diags3718 = diagsByCode[3718];
    if (diags3718) {
      const action = new vscode.CodeAction(
        'Apply all package import/export fixes for this file',
        vscode.CodeActionKind.QuickFix,
      );
      action.command = {
        title: action.title,
        command: CommandIds.ApplyImportExportFixes,
        arguments: [document.uri],
      };
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
    if (commandId && CUSTOM_CODEACTION_COMMANDS.includes(commandId)) {
      return item;
    }

    return next(item, token);
  },
} as const;
