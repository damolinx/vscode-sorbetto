import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient';
import { Configuration } from '../../common/configuration';
import { EXTENSION_PREFIX } from '../../constants';
import { HighlightType } from '../../lsp/highlightType';
import { LspConfigurationType } from './lspConfigurationType';
import {
  ToggleConfigurationKey,
  ConfigurationKey,
  LspOptionConfigurationKey,
  LspOptionConfigurationKeys,
} from './sorbetClientConfigurationSections';
import { WatchmanMode } from './watchmanMode';

export class SorbetClientConfiguration extends Configuration {
  private readonly onDidChangeLspConfigurationEmitter: vscode.EventEmitter<void>;
  private readonly onDidChangeLspOptionsEmitter: vscode.EventEmitter<LspOptionConfigurationKey>;
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
        } else if (affectsConfiguration(`${EXTENSION_PREFIX}.sorbetTypecheckCommand`, this.scope)) {
          if (
            ![LspConfigurationType.Custom, LspConfigurationType.Disabled].includes(
              this.lspConfigurationType,
            )
          ) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else if (
          affectsConfiguration(`${EXTENSION_PREFIX}.sorbetLspCustomConfiguration`, this.scope)
        ) {
          if (this.lspConfigurationType === LspConfigurationType.Custom) {
            this.onDidChangeLspConfigurationEmitter.fire();
          }
        } else {
          const lspOption = LspOptionConfigurationKeys.find((option) =>
            affectsConfiguration(`${EXTENSION_PREFIX}.${option}`, this.scope),
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

  public override getValue<T>(section: ConfigurationKey): T | undefined;
  public override getValue<T>(section: ConfigurationKey, defaultValue: T): T;
  public override getValue<T>(section: ConfigurationKey, defaultValue?: T): T | undefined {
    return super.getValue(section, defaultValue);
  }

  /**
   * Enable `watchman` mode.
   */
  public get enableWatchman(): WatchmanMode {
    return this.getValue('enableWatchman', WatchmanMode.Auto);
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
  public get highlightUntypedCodeDiagnosticSeverity(): vslc.DiagnosticSeverity | undefined {
    const strValue = this.getValue<keyof typeof vslc.DiagnosticSeverity>(
      'highlightUntypedCodeDiagnosticSeverity',
    );
    return strValue !== undefined ? vslc.DiagnosticSeverity[strValue] : undefined;
  }

  public override isEnabled(section: ToggleConfigurationKey, defaultValue = false): boolean {
    return super.isEnabled(section, defaultValue);
  }

  /**
   * Sorbet LSP launch {@link LspConfigurationType configuration type}.
   */
  public get lspConfigurationType(): LspConfigurationType {
    return this.getValue('sorbetLspConfiguration', LspConfigurationType.Stable);
  }

  /**
   * Event fired when the LSP launch configuration type changes.
   */
  public get onDidChangeLspConfig(): vscode.Event<void> {
    return this.onDidChangeLspConfigurationEmitter.event;
  }

  /**
   * Event fired when the LSP options change.
   */
  public get onDidChangeLspOptions(): vscode.Event<LspOptionConfigurationKey> {
    return this.onDidChangeLspOptionsEmitter.event;
  }

  /**
   * Patterns identifying files that should cause Sorbet to restart if changed.
   */
  public get restartFilePatterns(): string[] {
    return this.getValue<string[]>('restartFilePatterns', []);
  }

  /**
   * Custom Sorbet LSP launch configuration.
   */
  public get sorbetLspCustomConfiguration(): string[] {
    const configuration = this.getValue<string[]>('sorbetLspCustomConfiguration', []);
    return configuration.map(entry => entry.trim());
  }

  /**
   * Sorbet LSP launch configuration for typechecking..
   */
  public get sorbetTypecheckCommand(): string[] {
    return this.getValue('sorbetTypecheckCommand', ['bundle', 'exec', 'srb', 'typecheck']);
  }
}
