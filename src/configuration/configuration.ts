import * as vscode from 'vscode';
import { LspConfigurationType } from './lspConfigurationType';
import { EXTENSION_PREFIX } from '../constants';
import { HighlightType } from '../lsp/highlightType';

export type LspOptions = 'highlightUntypedCode' | 'restartFilePatterns' | 'typedFalseCompletionNudges';

export class Configuration implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly onDidChangeLspConfigurationEmitter: vscode.EventEmitter<void>;
  private readonly onDidChangeLspOptionsEmitter: vscode.EventEmitter<LspOptions>;

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
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}sorbetLspCustomConfiguration`)) {
          if (this.lspConfigurationType === LspConfigurationType.Custom) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.highlightUntypedCode`)) {
          this.onDidChangeLspOptionsEmitter.fire('highlightUntypedCode');
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

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
  }

  /**
   * Return a value from {@link EXTENSION_PREFIX} configuration.
   */
  public getValue<T>(section: string, defaultValue: T, configuration = this.getConfiguration()): T {
    return configuration.get(section, defaultValue);
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
  public get highlightUntypedCode(): HighlightType {
    return this.getValue('highlightUntypedCode', HighlightType.Disabled);
  }

  /**
  * Whether the Sorbet LSP is disabled by {@link lspConfigurationType configuration}.
  */
  public get lspDisabled(): boolean {
    return this.lspConfigurationType === LspConfigurationType.Disabled;
  }

  /**
   * Whether to show a notice explaining when Sorbet refuses to provide completion
   * results because a file is `# typed: false`.
   */
  public get nudgeTypedFalseCompletion(): boolean {
    return this.getValue('typedFalseCompletionNudges', true);
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
  public get onDidChangeLspOptions(): vscode.Event<LspOptions> {
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