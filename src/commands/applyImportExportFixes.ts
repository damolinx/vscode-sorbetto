import * as vscode from 'vscode';
import { CommandIds } from '../commandIds';
import {
  getDiagnosticCode,
  groupDiagnosticsByCode,
  PACKAGE_DIAGNOSTIC_CODES,
} from '../common/diagnostics';
import { ExtensionContext } from '../extensionContext';
import { savePackageFiles } from './savePackageFiles';

export async function applyImportExportFixes(
  context: ExtensionContext,
  uri: vscode.Uri,
): Promise<void> {
  const groups = Object.values(
    groupDiagnosticsByCode(vscode.languages.getDiagnostics(uri), ...PACKAGE_DIAGNOSTIC_CODES),
  ).filter((d): d is vscode.Diagnostic[] => Boolean(d?.length));

  if (groups.length === 0) {
    context.log.info('ApplyImportExportFixes: Found no relevant diagnostics');
    return;
  }

  const allActions: vscode.CodeAction[] = [];

  for (const group of groups) {
    const uniqueDiagnostics = deduplicateDiagnostics(group);
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
      `ApplyImportExportFixes: Found ${uniqueDiagnostics.size} diagnostic(s) with code ${getDiagnosticCode(group[0]) ?? 'unknown'}`,
    );
  }
  context.log.debug(`ApplyImportExportFixes: Found ${allActions.length} actions(s) to apply`);

  if (allActions.length) {
    for (const action of deduplicateActions(allActions)) {
      if (action.edit) {
        await vscode.workspace.applyEdit(action.edit);
      }
    }
    await savePackageFiles(context);
  }
}

function deduplicateDiagnostics(diagnostics: vscode.Diagnostic[]) {
  const uniqueDiagnostics = new Map(diagnostics.map((d) => [d.message, d]));
  return uniqueDiagnostics;
}

function deduplicateActions(actions: vscode.CodeAction[]): vscode.CodeAction[] {
  // Deduplicate by title - this could be improved by analyzing edits
  const sortedActions = [...actions].sort((a, b) => b.title.length - a.title.length);
  const result: vscode.CodeAction[] = [];

  for (const action of sortedActions) {
    if (!result.some((k) => k.title.includes(action.title))) {
      result.push(action);
    }
  }

  return result;
}
