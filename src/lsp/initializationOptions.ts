import { DiagnosticSeverity } from 'vscode';
import { HighlightType } from './highlightType';

/**
 * Sorbet LSP initialization options.
 * https://sorbet.org/docs/lsp#initialize-request
 */
export interface InitializationOptions {
  /**
   * Whether to show a notice explaining when Sorbet refuses to provide
   * completion results because a file is # typed: false. Default: `true`.
   * See https://sorbet.org/docs/vscode#sorbettypedfalsecompletionnudges
   */
  enableTypedFalseCompletionNudges?: boolean;
  /**
   * Whether to highlight usages of untyped. Default: {@link HighlightType.Everywhere}.
   * See https://sorbet.org/docs/vscode#sorbethighlightuntyped
   */
  highlightUntyped?: boolean | HighlightType;
  /**
   * {@link DiagnosticSeverity Severity} to report usages of untyped at. Applies only when
   * {@link highlightUntyped} is enabled. Defaults to {@link DiagnosticSeverity.Information}
   * when undefined.
   * See https://sorbet.org/docs/vscode#sorbethighlightuntypeddiagnosticseverity
   */
  highlightUntypedDiagnosticSeverity?: DiagnosticSeverity;
  /**
   * Whether to show Sorbet server statuses.
   * See https://sorbet.org/docs/server-status#api
   */
  supportsOperationNotifications?: boolean;
  /**
   * Support openining synthetic or missing files.
   * See https://sorbet.org/docs/sorbet-uris
   */
  supportsSorbetURIs?: boolean;
}