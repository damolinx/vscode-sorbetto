import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { AUTOCORRECT_ALL_ID } from '../../commandIds';

export const CodeActionMiddleware: vslc.CodeActionMiddleware = {
  provideCodeActions: async (
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
    next: vslc.ProvideCodeActionsSignature,
  ): Promise<(vscode.Command | vscode.CodeAction)[] | undefined | null> => {
    const actions = await next(document, range, context, token);
    if (!actions?.filter((a) => 'kind' in a && a.kind === vscode.CodeActionKind.QuickFix).length) {
      return actions;
    }

    for (const code of getUniqueCode()) {
      const action = new vscode.CodeAction(
        `Apply Sorbet fixes for error ${code} to all files`,
        vscode.CodeActionKind.QuickFix,
      );
      action.command = {
        title: action.title,
        command: AUTOCORRECT_ALL_ID,
        arguments: [code, document.uri],
      };
      actions.push(action);
    }

    return actions;

    function getUniqueCode() {
      const uniqueCodes = new Set<string | number>();
      for (const diagnostic of context.diagnostics) {
        switch (typeof diagnostic.code) {
          case 'object':
            uniqueCodes.add(diagnostic.code.value);
            break;
          case 'number':
          case 'string':
            uniqueCodes.add(diagnostic.code);
            break;
        }
      }
      return uniqueCodes;
    }
  },
  resolveCodeAction: (
    item: vscode.CodeAction,
    token: vscode.CancellationToken,
    next: vslc.ResolveCodeActionSignature,
  ): vscode.ProviderResult<vscode.CodeAction> => {
    const commandId = item.command?.command;
    if (commandId && [AUTOCORRECT_ALL_ID].some((prefix) => commandId === prefix)) {
      return item;
    }

    return next(item, token);
  },
} as const;
