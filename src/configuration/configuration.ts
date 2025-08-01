import * as vscode from 'vscode';
import { LspConfigurationOptions } from './lspConfigurationOptions';
import { LspConfigurationType } from './lspConfigurationType';
import { EXTENSION_PREFIX } from '../constants';
import { HighlightType } from '../lsp/highlightType';

export class Configuration implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly onDidChangeLspConfigurationEmitter: vscode.EventEmitter<void>;
  private readonly onDidChangeLspOptionsEmitter: vscode.EventEmitter<LspConfigurationOptions>;

  constructor() {
    this.disposables = [
      this.onDidChangeLspConfigurationEmitter = new vscode.EventEmitter(),
      this.onDidChangeLspOptionsEmitter = new vscode.EventEmitter(),
      vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspConfiguration`)) {
          this.onDidChangeLspConfigurationEmitter.fire();
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspBaseConfiguration`)) {
          if (![LspConfigurationType.Custom, LspConfigurationType.Disabled].includes(this.lspConfigurationType)) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspCustomConfiguration`)) {
          if (this.lspConfigurationType === LspConfigurationType.Custom) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.highlightUntypedCode`)) {
          this.onDidChangeLspOptionsEmitter.fire('highlightUntypedCode');
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.highlightUntypedCodeDiagnosticSeverity`)) {
          this.onDidChangeLspOptionsEmitter.fire('highlightUntypedCodeDiagnosticSeverity');
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.restartFilePatterns`)) {
          this.onDidChangeLspOptionsEmitter.fire('restartFilePatterns');
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.typedFalseCompletionNudges`)) {
          this.onDidChangeLspOptionsEmitter.fire('typedFalseCompletionNudges');
        }
      }),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
  }

  /**
   * Return a value from {@link EXTENSION_PREFIX} configuration.
   */
  public getValue<T>(section: string): T | undefined;
  public getValue<T>(section: string, defaultValue: T): T;
  public getValue<T>(section: string, defaultValue?: T): T | undefined {
    return this.configuration.get(section, defaultValue);
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
   * Whether to highlight usages of untyped even outside of `# typed: strong` files.
   */
  public get highlightUntypedCodeDiagnosticSeverity(): vscode.DiagnosticSeverity | undefined {
    return this.getValue<vscode.DiagnosticSeverity>('highlightUntypedCodeDiagnosticSeverity');
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
  public get onDidChangeLspOptions(): vscode.Event<LspConfigurationOptions> {
    return this.onDidChangeLspOptionsEmitter.event;
  }

  public get sorbetLspBaseConfiguration(): string[] {
    return this.getValue('sorbetLspBaseConfiguration',
      ['bundle', 'exec', 'srb', 'typecheck', '--lsp']);
  }

  public get sorbetLspCustomConfiguration(): string[] {
    return this.getValue('sorbetLspCustomConfiguration',
      this.sorbetLspBaseConfiguration);
  }
}