import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { AUTOCORRECT_ALL_ID } from './commands/commandIds';

export class SorbetMiddleware implements vslc.Middleware {

  public async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
    next: vslc.ProvideCodeActionsSignature): Promise<(vscode.Command | vscode.CodeAction)[] | undefined | null> {
    const actions = await next(document, range, context, token);
    if (!actions?.length) {
      return actions;
    }

    for (const code of getUniqueCode()) {
      const action = new vscode.CodeAction(`Fix error ${code} in all files`, vscode.CodeActionKind.QuickFix);
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
  }

  public resolveCodeAction(item: vscode.CodeAction, token: vscode.CancellationToken, next: vslc.ResolveCodeActionSignature): vscode.ProviderResult<vscode.CodeAction> {
    const commandId = item.command?.command;
    if (commandId && [AUTOCORRECT_ALL_ID].some(prefix => commandId === prefix)) {
      return item;
    }

    return next(item, token);
  }
}