import * as vscode from 'vscode';

type GroupedDiagnostics = Record<number, vscode.Diagnostic[] | undefined>;

export function groupDiagnosticsByCode(
  diagnostics: readonly vscode.Diagnostic[],
  ...codes: number[]
): GroupedDiagnostics {
  return diagnostics.reduce((acc, diagnostic) => {
    const code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
    if (typeof code === 'number' && codes.includes(code)) {
      (acc[code] ??= []).push(diagnostic);
    }
    return acc;
  }, {} as GroupedDiagnostics);
}
