import * as vscode from 'vscode';
import { CommandIds } from '../commandIds';
import { groupDiagnosticsByCode } from '../common/diagnostics';
import { ExtensionContext } from '../extensionContext';
import { savePackageFiles } from './savePackageFiles';

export async function applyImportExportFixes(
  context: ExtensionContext,
  uri: vscode.Uri,
): Promise<void> {
  const diagnostics = groupDiagnosticsByCode(vscode.languages.getDiagnostics(uri), 3718)[3718];
  if (!diagnostics?.length) {
    context.log.info('ApplyImportExportFixes: Found no relevant diagnostics');
    return;
  }

  const uniqueDiagnostics = new Map(diagnostics.map((d) => [d.message, d]));
  const allActions = [] as vscode.CodeAction[];
  for (const diagnostic of uniqueDiagnostics.values()) {
    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      'vscode.executeCodeActionProvider',
      uri,
      diagnostic.range,
      vscode.CodeActionKind.QuickFix.value,
    );
    if (actions?.length) {
      allActions.push(
        ...actions.filter(
          ({ kind, command, title }) =>
            kind?.value === vscode.CodeActionKind.QuickFix.value &&
            command?.command === CommandIds.SavePackageFiles &&
            (title.includes('Import') || title.includes('Export')),
        ),
      );
    }
  }
  context.log.debug(
    `ApplyImportExportFixes: Found ${uniqueDiagnostics.size} diagnostic(s); ${allActions.length} actions(s)`,
  );

  if (allActions.length) {
    for (const action of allActions) {
      if (action.edit) {
        await vscode.workspace.applyEdit(action.edit);
      }
    }
    await savePackageFiles(context);
  }
}
