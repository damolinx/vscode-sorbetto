import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { AUTOCORRECT_ALL_ID } from '../commands/commandIds';

export class LanguageClientMiddleware implements vslc.Middleware {
  public async handleDiagnostics(
    uri: vscode.Uri,
    diagnostics: vscode.Diagnostic[],
    next: vslc.HandleDiagnosticsSignature,
  ): Promise<void> {
    diagnostics.forEach((diagnostic) => {
      if (diagnostic.relatedInformation?.length && diagnostic.relatedInformation.length > 1) {
        diagnostic.relatedInformation = diagnostic.relatedInformation.reduce((acc, curr) => {
          const trimmedMessage = curr.message.replace(/\n{2,}/g, '\n').trim();
          if (!trimmedMessage) {
            return acc;
          }

          const last = acc.at(-1);
          if (
            !last ||
            !last.location.range.isEqual(curr.location.range) ||
            last.location.uri.toString() !== curr.location.uri.toString()
          ) {
            acc.push(curr);
          } else {
            last.message += ` ${trimmedMessage}`;
          }
          return acc;
        }, [] as vscode.DiagnosticRelatedInformation[]);
      }
    });
    return next(uri, diagnostics);
  }

  public async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
    next: vslc.ProvideCodeActionsSignature,
  ): Promise<(vscode.Command | vscode.CodeAction)[] | undefined | null> {
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
  }

  public resolveCodeAction(
    item: vscode.CodeAction,
    token: vscode.CancellationToken,
    next: vslc.ResolveCodeActionSignature,
  ): vscode.ProviderResult<vscode.CodeAction> {
    const commandId = item.command?.command;
    if (commandId && [AUTOCORRECT_ALL_ID].some((prefix) => commandId === prefix)) {
      return item;
    }

    return next(item, token);
  }
}
