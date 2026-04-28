import * as vscode from 'vscode';

type DiagnosticCode = string | number;
type GroupedDiagnostics = Record<DiagnosticCode, vscode.Diagnostic[] | undefined>;

export const PACKAGE_DIAGNOSTIC_CODES = [3717, 3718] as const;

export function getDiagnosticCode(diagnostic: vscode.Diagnostic): DiagnosticCode | undefined {
  return typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
}

export function groupDiagnosticsByCode(
  diagnostics: readonly vscode.Diagnostic[],
  ...codes: DiagnosticCode[]
): GroupedDiagnostics {
  return diagnostics.reduce((acc, diagnostic) => {
    const code = getDiagnosticCode(diagnostic);
    if (code !== undefined && codes.includes(code)) {
      (acc[code] ??= []).push(diagnostic);
    }
    return acc;
  }, {} as GroupedDiagnostics);
}

export function hasDiagnosticWithCode(
  diagnostics: readonly vscode.Diagnostic[],
  ...codes: DiagnosticCode[]
): boolean {
  return diagnostics.some((d) => {
    const code = getDiagnosticCode(d);
    return code !== undefined && codes.includes(code);
  });
}
