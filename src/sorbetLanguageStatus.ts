import * as vscode from 'vscode';
import { CommandIds } from './commandIds';
import { onMainAreaActiveTextEditorChanged, mainAreaActiveEditorUri } from './common/utils';
import { ExtensionContext } from './extensionContext';
import { SORBET_CONFIG_DOCUMENT_SELECTOR, SORBET_DOCUMENT_SELECTOR } from './lsp/documentSelectors';
import { LspConfigurationType } from './lspClient/configuration/lspConfigurationType';
import { SorbetClient } from './lspClient/sorbetClient';
import { SorbetClientStatus } from './lspClient/sorbetClientStatus';

const OpenConfigurationSettings: vscode.Command = {
  arguments: [undefined, 'sorbetto.sorbetLsp'],
  command: CommandIds.OpenSettings,
  title: 'Settings',
  tooltip: 'Open Sorbet Settings',
};

const StartCommand: vscode.Command = {
  command: CommandIds.SorbetRestart,
  title: 'Start',
  tooltip: 'Start Sorbet',
};

const ShowOutputCommand: vscode.Command = {
  command: CommandIds.ShowOutput,
  title: 'Output',
  tooltip: 'View Sorbet Output',
};

export class SorbetLanguageStatus implements vscode.Disposable {
  private readonly context: ExtensionContext;
  private currentClient?: {
    client: SorbetClient;
    disposables: vscode.Disposable[];
  };
  private readonly disposables: vscode.Disposable[];

  private readonly configItem: vscode.LanguageStatusItem;
  private readonly statusItem: vscode.LanguageStatusItem;

  constructor(context: ExtensionContext) {
    this.context = context;

    const selector = this.getSelector();
    this.configItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-config', selector);
    this.setConfig({ configType: LspConfigurationType.Disabled });
    this.statusItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-status', selector);
    this.setStatus({ status: 'Disabled' });

    const clientHandler = (client: SorbetClient) => this.handleEditorOrStatusChange(client);
    const withClientHandler = ({ client }: { client: SorbetClient }) =>
      this.handleEditorOrStatusChange(client);

    this.disposables = [
      onMainAreaActiveTextEditorChanged((editor) =>
        this.handleEditorOrStatusChange(editor?.document.uri),
      ),
      this.context.clientManager.onClientAdded(clientHandler),
      this.context.clientManager.onClientRemoved(clientHandler),
      this.context.clientManager.onShowOperation(withClientHandler),
      this.context.clientManager.onStatusChanged(withClientHandler),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('sorbetto.alwaysShowStatusItems')) {
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

  private get alwaysShowStatusItem(): boolean {
    return this.context.configuration.getValue('alwaysShowStatusItems', false);
  }

  private getSelector(): vscode.DocumentSelector {
    return this.alwaysShowStatusItem
      ? '*'
      : SORBET_DOCUMENT_SELECTOR.concat(SORBET_CONFIG_DOCUMENT_SELECTOR);
  }

  private handleEditorOrStatusChange(clientOrContextUri?: SorbetClient | vscode.Uri) {
    let targetClient: SorbetClient | undefined;
    if (clientOrContextUri instanceof SorbetClient) {
      targetClient = clientOrContextUri;
    } else if (this.context.clientManager.clientCount === 1) {
      [targetClient] = this.context.clientManager.getClients();
    } else {
      const contextUri = clientOrContextUri ?? mainAreaActiveEditorUri();
      targetClient = contextUri && this.context.clientManager.getClient(contextUri);
    }

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
    const {
      configuration: { lspConfigurationType },
      operations,
    } = client;
    this.setConfig({ client, configType: lspConfigurationType });

    if (client.status !== SorbetClientStatus.Error && operations.length > 0) {
      this.setStatus({
        client,
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (client.status) {
        case SorbetClientStatus.Disabled:
          this.setStatus({
            client,
            severity: vscode.LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case SorbetClientStatus.Error:
          this.setStatus({
            client,
            detail:
              'Sorbet language server encountered an error. See the Output panel for details.',
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Error',
          });
          break;
        case SorbetClientStatus.Initializing:
          this.setStatus({
            client,
            busy: true,
            detail: 'Starting up Sorbet language server …',
            status: 'Initializing',
          });
          break;
        case SorbetClientStatus.Running:
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
    detail?: string;
    severity?: vscode.LanguageStatusSeverity;
    status?: string;
  }): void {
    const {
      busy = false,
      client,
      detail = this.getWorkspaceAwareDetail('Sorbet Status', options.client),
      severity = vscode.LanguageStatusSeverity.Information,
      status = 'Unknown',
    } = options;
    this.statusItem.busy = busy;
    this.statusItem.severity = severity;
    this.statusItem.text = `$(ruby) ${status}`;

    if (client?.isEnabledByConfiguration()) {
      this.statusItem.command = client.isActive() ? ShowOutputCommand : StartCommand;
      this.statusItem.detail = detail;
    } else {
      this.statusItem.command = undefined;
      this.statusItem.detail = 'Sorbet is disabled by configuration';
    }
  }

  private getWorkspaceAwareDetail(prefix: string, client?: SorbetClient): string | undefined {
    return client && this.context.clientManager.clientCount > 1
      ? `${prefix} (${client.workspaceFolder.name})`
      : prefix;
  }
}
