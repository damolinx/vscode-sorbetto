import * as vscode from 'vscode';
import { SHOW_OUTPUT_ID, SORBET_RESTART_ID } from './commands/commandIds';
import { LspConfigurationType } from './configuration/lspConfigurationType';
import { SORBET_DOCUMENT_SELECTOR } from './lsp/constants';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus } from './types';
import { SorbetClient } from './sorbetClient';
import { SorbetClientEvent } from './sorbetStatusProvider';

const OpenConfigurationSettings: vscode.Command = {
  arguments: ['sorbetto.sorbetLsp'],
  command: 'workbench.action.openWorkspaceSettings',
  title: 'Configure',
  tooltip: 'Open Configuration Settings',
};

const StartCommand: vscode.Command = {
  command: SORBET_RESTART_ID,
  title: 'Start',
  tooltip: 'Start Sorbet',
};

const ShowOutputCommand: vscode.Command = {
  command: SHOW_OUTPUT_ID,
  title: 'Output',
  tooltip: 'Show Sorbet Output',
};

export class SorbetLanguageStatus implements vscode.Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];

  private readonly configItem: vscode.LanguageStatusItem;
  private readonly statusItem: vscode.LanguageStatusItem;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    const { configuration, statusProvider } = this.context;

    this.configItem = vscode.languages.createLanguageStatusItem(
      'ruby-sorbet-config', SORBET_DOCUMENT_SELECTOR);
    this.setConfig();
    this.statusItem = vscode.languages.createLanguageStatusItem(
      'ruby-sorbet-status', SORBET_DOCUMENT_SELECTOR);
    this.setStatus({ status: 'Disabled', command: StartCommand });

    const withClientHandler = ({ client }: SorbetClientEvent) => {
      if (client.inScope()) {
        this.render(client);
      }
    };
    const withoutClientHandler = () => {
      const client = this.context.clientManager.sorbetClient;
      if (client) {
        withClientHandler({ client });
      }
    };

    this.disposables = [
      vscode.window.onDidChangeActiveTextEditor(withoutClientHandler),
      configuration.onDidChangeLspConfig(withoutClientHandler),
      statusProvider.onShowOperation(withClientHandler),
      statusProvider.onStatusChanged(withClientHandler),
      this.configItem,
      this.statusItem,
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private render(client: SorbetClient) {
    const { lspConfigurationType } = this.context.configuration;
    const { operations } = this.context.statusProvider;
    this.setConfig({ configType: lspConfigurationType });

    if (client.status !== ServerStatus.ERROR && operations.length > 0) {
      this.setStatus({
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (client.status) {
        case ServerStatus.DISABLED:
          this.setStatus({
            command: StartCommand,
            severity: vscode.LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case ServerStatus.ERROR:
          this.setStatus({
            detail: 'Sorbet LSP ran into an error. See Output panel for details',
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Error',
          });
          break;
        case ServerStatus.INITIALIZING:
          this.setStatus({
            busy: true,
            status: 'Initializing',
          });
          break;
        case ServerStatus.RESTARTING:
          this.setStatus({
            busy: true,
            detail: 'Sorbet is restarting',
            status: 'Initializing',
          });
          break;
        case ServerStatus.RUNNING:
          this.setStatus({ status: 'Idle' });
          break;
        default:
          this.context.log.error('Invalid ServerStatus', client.status);
          this.setStatus({
            detail: `Unknown Status: ${client.status}`,
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Unknown',
          });
          break;
      }
    }
  }

  private setConfig(options?: {
    configType?: LspConfigurationType
  }): void {
    const config = options?.configType ?? this.context.configuration.lspConfigurationType;
    const titleCasedConfig = config.charAt(0).toUpperCase() + config.slice(1);
    this.configItem.command = OpenConfigurationSettings;
    this.configItem.detail = 'Sorbet Configuration';
    this.configItem.text = `$(ruby) ${titleCasedConfig}`;
  }

  private setStatus(options?: {
    busy?: boolean,
    command?: vscode.Command,
    detail?: string,
    severity?: vscode.LanguageStatusSeverity,
    status?: string
  }): void {
    this.statusItem.busy = options?.busy ?? false;
    this.statusItem.command = options?.command ?? ShowOutputCommand;
    this.statusItem.detail = options?.detail ?? 'Sorbet Status';
    this.statusItem.severity = options?.severity ?? vscode.LanguageStatusSeverity.Information;
    this.statusItem.text = `$(ruby) ${options?.status ?? 'Unknown'}`;
  }
}
