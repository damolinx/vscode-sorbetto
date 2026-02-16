import * as vslc from 'vscode-languageclient';
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
   * Whether to highlight usages of untyped. Default: {@link HighlightType.Nowhere}.
   * See https://sorbet.org/docs/vscode#sorbethighlightuntyped
   */
  highlightUntyped?: boolean | HighlightType;

  /**
   * {@link vslc.DiagnosticSeverity Severity} to highlight usages of untyped at.
   * Applies {@link highlightUntyped} is enabled. Defaults to
   * {@link vslc.DiagnosticSeverity.Warning} when `undefined`.
   * See https://sorbet.org/docs/vscode#sorbethighlightuntypeddiagnosticseverity
   *
   * **Important**: `vscode` uses 0-based severities, `vslc` uses 1-based so they
   * are only interchangeable by name.
   */
  highlightUntypedDiagnosticSeverity?: vslc.DiagnosticSeverity;

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
