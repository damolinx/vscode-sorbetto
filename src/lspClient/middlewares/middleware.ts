import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';

const COMPACT_SORBET_DIAGNOSTICS_CONFIG_KEY = 'sorbetto.compactSorbetDiagnostics';

/**
 * Provides `vslc._Middleware` portion only.
 */
export const Middleware: vslc.Middleware = {
  async handleDiagnostics(
    uri: vscode.Uri,
    diagnostics: vscode.Diagnostic[],
    next: vslc.HandleDiagnosticsSignature,
  ): Promise<void> {
    if (vscode.workspace.getConfiguration().get(COMPACT_SORBET_DIAGNOSTICS_CONFIG_KEY, true)) {
      diagnostics.forEach((diagnostic) => {
        diagnostic.message = compact(diagnostic.message);

        if (diagnostic.relatedInformation?.length && diagnostic.relatedInformation.length > 1) {
          diagnostic.relatedInformation = diagnostic.relatedInformation.reduce((acc, curr) => {
            const trimmedMessage = compact(curr.message);
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
    }
    return next(uri, diagnostics);
  },
} as const;

function compact(msg: string): string {
  return msg.replace(/\.?\n+\s*/g, '. ').trim();
}
