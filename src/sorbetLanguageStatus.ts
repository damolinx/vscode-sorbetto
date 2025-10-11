import * as vscode from 'vscode';
import { OPEN_SETTINGS_ID, SHOW_OUTPUT_ID, SORBET_RESTART_ID } from './commands/commandIds';
import { onMainAreaActiveTextEditorChanged, mainAreaActiveTextEditorUri } from './common/utils';
import { SORBET_DOCUMENT_SELECTOR } from './lsp/documentSelectors';
import { LspConfigurationType } from './lspClient/configuration/lspConfigurationType';
import { SorbetClient } from './lspClient/sorbetClient';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { LspStatus } from './types';

const OpenConfigurationSettings: vscode.Command = {
  arguments: [undefined, 'sorbetto.sorbetLspConfiguration'],
  command: OPEN_SETTINGS_ID,
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

const ALWAYS_SHOW_CONFIG_KEY = 'sorbetto.alwaysShowStatusItems';

export class SorbetLanguageStatus implements vscode.Disposable {
  private readonly context: SorbetExtensionContext;
  private currentClient?: {
    client: SorbetClient;
    disposables: vscode.Disposable[];
  };
  private readonly disposables: vscode.Disposable[];

  private readonly configItem: vscode.LanguageStatusItem;
  private readonly statusItem: vscode.LanguageStatusItem;

  constructor(context: SorbetExtensionContext) {
    this.context = context;

    const selector = this.getSelector();
    this.configItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-config', selector);
    this.setConfig({ configType: LspConfigurationType.Disabled });
    this.statusItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-status', selector);
    this.setStatus({ status: 'Disabled', command: StartCommand });

    this.disposables = [
      onMainAreaActiveTextEditorChanged((editor) =>
        this.handleEditorOrStatusChange(undefined, editor),
      ),
      this.context.statusProvider.onShowOperation(({ client }) =>
        this.handleEditorOrStatusChange(client),
      ),
      this.context.statusProvider.onStatusChanged(({ client }) =>
        this.handleEditorOrStatusChange(client),
      ),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(ALWAYS_SHOW_CONFIG_KEY)) {
          const selector = this.getSelector();
          this.configItem.selector = selector;
          this.statusItem.selector = selector;
        }
      }),
      this.configItem,
      this.statusItem,
    ];
  }

  dispose(): void {
    this.disposeCurrentClient();
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private disposeCurrentClient() {
    if (this.currentClient) {
      vscode.Disposable.from(...this.currentClient.disposables).dispose();
      this.currentClient = undefined;
    }
  }

  private getSelector(): vscode.DocumentSelector {
    const alwaysShowStatus = vscode.workspace.getConfiguration().get(ALWAYS_SHOW_CONFIG_KEY, false);
    return alwaysShowStatus ? '*' : SORBET_DOCUMENT_SELECTOR;
  }

  private handleEditorOrStatusChange(client?: SorbetClient, editor?: vscode.TextEditor) {
    const targetUri = editor?.document.uri ?? mainAreaActiveTextEditorUri();
    const targetClient =
      targetUri && client?.inScope(targetUri)
        ? client
        : targetUri
          ? this.context.clientManager.getClient(targetUri)
          : undefined;

    if (targetClient) {
      if (this.currentClient?.client !== targetClient) {
        this.disposeCurrentClient();
        this.currentClient = {
          client: targetClient,
          disposables: [targetClient.onStatusChanged(({ client }) => this.render(client))],
        };
      }
      this.render(targetClient);
    } else {
      this.disposeCurrentClient();
    }
  }

  private render(client: SorbetClient) {
    const { lspConfigurationType } = client.configuration;
    const { operations } = this.context.statusProvider;
    this.setConfig({ client, configType: lspConfigurationType });

    if (client.status !== LspStatus.Error && operations.length > 0) {
      this.setStatus({
        client,
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (client.status) {
        case LspStatus.Disabled:
          this.setStatus({
            client,
            command: StartCommand,
            severity: vscode.LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case LspStatus.Error:
          this.setStatus({
            client,
            detail: 'Sorbet LSP ran into an error. See Output panel for details',
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Error',
          });
          break;
        case LspStatus.Initializing:
          this.setStatus({
            client,
            busy: true,
            status: 'Initializing',
          });
          break;
        case LspStatus.Restarting:
          this.setStatus({
            client,
            busy: true,
            detail: 'Sorbet is restarting',
            status: 'Initializing',
          });
          break;
        case LspStatus.Running:
          this.setStatus({ client, status: 'Idle' });
          break;
        default:
          this.context.log.error('Invalid ServerStatus', client.status);
          this.setStatus({
            client,
            detail: `Unknown Status: ${client.status}`,
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Unknown',
          });
          break;
      }
    }
  }

  private setConfig(options: { client?: SorbetClient; configType?: LspConfigurationType }): void {
    const titleCasedConfig = options.configType
      ? options.configType.charAt(0).toUpperCase() + options.configType.slice(1)
      : '';
    this.configItem.command = OpenConfigurationSettings;
    this.configItem.detail = this.getWorkspaceAwareDetail('Sorbet Configuration', options.client);
    this.configItem.text = `$(ruby) ${titleCasedConfig}`;
  }

  private setStatus(options: {
    client?: SorbetClient;
    busy?: boolean;
    command?: vscode.Command;
    detail?: string;
    severity?: vscode.LanguageStatusSeverity;
    status?: string;
  }): void {
    const {
      busy = false,
      command = ShowOutputCommand,
      detail = this.getWorkspaceAwareDetail('Sorbet Status', options.client),
      severity = vscode.LanguageStatusSeverity.Information,
      status = 'Unknown',
    } = options;
    this.statusItem.busy = busy;
    this.statusItem.command = command;
    this.statusItem.detail = detail;
    this.statusItem.severity = severity;
    this.statusItem.text = `$(ruby) ${status}`;
  }

  private getWorkspaceAwareDetail(prefix: string, client?: SorbetClient): string | undefined {
    return client && this.context.clientManager.clientCount > 1
      ? `${prefix} (${client.workspaceFolder.name})`
      : prefix;
  }
}
