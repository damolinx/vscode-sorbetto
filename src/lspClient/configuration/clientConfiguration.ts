import * as vscode from 'vscode';
import { Configuration } from '../../common/configuration';
import { EXTENSION_PREFIX } from '../../constants';
import { HighlightType } from '../../lsp/highlightType';
import { EnableWatchmanType } from './enableWatchmanType';
import { LspConfigurationOption, LspConfigurationOptions } from './lspConfigurationOptions';
import { LspConfigurationType } from './lspConfigurationType';

export class ClientConfiguration extends Configuration {
  private readonly onDidChangeLspConfigurationEmitter: vscode.EventEmitter<void>;
  private readonly onDidChangeLspOptionsEmitter: vscode.EventEmitter<LspConfigurationOption>;
  private readonly scope?: vscode.WorkspaceFolder;

  constructor(scope?: vscode.WorkspaceFolder) {
    super();
    this.scope = scope;
    this.disposables.push(
      (this.onDidChangeLspConfigurationEmitter = new vscode.EventEmitter()),
      (this.onDidChangeLspOptionsEmitter = new vscode.EventEmitter()),
      vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspConfiguration`, this.scope)) {
          this.onDidChangeLspConfigurationEmitter.fire();
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetTypecheckCommand`)) {
          if (
            ![LspConfigurationType.Custom, LspConfigurationType.Disabled].includes(
              this.lspConfigurationType,
            )
          ) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspCustomConfiguration`)) {
          if (this.lspConfigurationType === LspConfigurationType.Custom) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else {
          const lspOption = LspConfigurationOptions.find((option) =>
            affectsConfiguration(`${EXTENSION_PREFIX}.${option}`),
          );
          if (lspOption) {
            this.onDidChangeLspOptionsEmitter.fire(lspOption);
          }
        }
      }),
    );
  }

  protected override get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX, this.scope);
  }

  /**
   * Enable all beta features.
   */
  public get enableAllBetaFeatures(): boolean {
    return this.getValue('enableAllBetaFeatures', false);
  }

  /**
   * Enable all experimental features.
   */
  public get enableAllExperimentalFeatures(): boolean {
    return this.getValue('enableAllExperimentalFeatures', false);
  }

  /**
   * Enable RBS support.
   */
  public get enableRbsSupport(): boolean {
    return this.getValue('enableRbsSupport', false);
  }

  /**
   * Enable `requires_ancestor` support.
   */
  public get enableRequiresAncestor(): boolean {
    return this.getValue('enableRequiresAncestor', false);
  }

  /**
   * Enable `watchman` mode.
   */
  public get enableWatchman(): EnableWatchmanType {
    return this.getValue('enableWatchman', EnableWatchmanType.Auto);
  }

  /**
   * Sorbet LSP launch {@link LspConfigurationType configuration type}.
   */
  public get lspConfigurationType(): LspConfigurationType {
    return this.getValue('sorbetLspConfiguration', LspConfigurationType.Stable);
  }

  /**
   * Whether to highlight usages of untyped even outside of `# typed: strong` files.
   */
  public get highlightUntypedCode(): HighlightType | undefined {
    return this.getValue<HighlightType>('highlightUntypedCode');
  }

  /**
   * {@link DiagnosticSeverity Severity} to highlight usages of untyped at.
   */
  public get highlightUntypedCodeDiagnosticSeverity(): vscode.DiagnosticSeverity | undefined {
    const strValue = this.getValue<string>('highlightUntypedCodeDiagnosticSeverity');
    return strValue !== undefined
      ? vscode.DiagnosticSeverity[strValue as keyof typeof vscode.DiagnosticSeverity]
      : undefined;
  }

  /**
   * Whether the Sorbet LSP is disabled by {@link lspConfigurationType configuration}.
   */
  public get isDisabled(): boolean {
    return this.lspConfigurationType === LspConfigurationType.Disabled;
  }

  /**
   * Whether to show a notice explaining when Sorbet refuses to provide completion
   * results because a file is `# typed: false`.
   */
  public get nudgeTypedFalseCompletion(): boolean | undefined {
    return this.getValue('typedFalseCompletionNudges');
  }

  /**
   * Patterns identifying files that should cause Sorbet to restart if changed.
   */
  public get restartFilePatterns(): string[] {
    return this.getValue('restartFilePatterns', []);
  }

  /**
   * Event that is fired when the LSP launch configuration type changes.
   */
  public get onDidChangeLspConfig(): vscode.Event<void> {
    return this.onDidChangeLspConfigurationEmitter.event;
  }

  /**
   * Event that is fired when the LSP options change.
   */
  public get onDidChangeLspOptions(): vscode.Event<LspConfigurationOption> {
    return this.onDidChangeLspOptionsEmitter.event;
  }

  public get sorbetLspCustomConfiguration(): string[] {
    return this.getValue('sorbetLspCustomConfiguration', []);
  }

  public get sorbetTypecheckCommand(): string[] {
    return this.getValue('sorbetTypecheckCommand', ['bundle', 'exec', 'srb', 'typecheck']);
  }
}
