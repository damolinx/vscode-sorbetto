import * as vscode from 'vscode';
import { CommandIds } from './commandIds';
import { onMainAreaActiveTextEditorChanged, mainAreaActiveEditorUri } from './common/utils';
import { SORBET_CONFIG_DOCUMENT_SELECTOR, DOCUMENT_SELECTOR } from './constants';
import { ExtensionContext } from './extensionContext';
import { LspConfigurationType } from './runtime/configuration/lspConfigurationType';
import { SorbetClientHost } from './runtime/host/sorbetClientHost';
import { SorbetClientHostStatus } from './runtime/host/sorbetClientHostStatus';

const OpenConfigurationSettings: vscode.Command = {
  arguments: [undefined, 'sorbetto.sorbetLsp'],
  command: CommandIds.OpenSettings,
  title: 'Settings',
  tooltip: 'Open Sorbet Settings',
};

const ShowClientActions: vscode.Command = {
  command: CommandIds.ShowClientActions,
  title: 'Actions',
  tooltip: 'Show Sorbet actions',
};

export class SorbetLanguageStatus implements vscode.Disposable {
  private readonly context: ExtensionContext;
  private currentClientHost?: {
    clientHost: SorbetClientHost;
    disposables: vscode.Disposable[];
  };
  private readonly disposables: vscode.Disposable[];

  private readonly configItem: vscode.LanguageStatusItem;
  private readonly statusItem: vscode.LanguageStatusItem;

  constructor(context: ExtensionContext) {
    this.context = context;

    const selector = this.getSelector();
    this.configItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-config', selector);
    this.configItem.command = OpenConfigurationSettings;

    this.statusItem = vscode.languages.createLanguageStatusItem('ruby-sorbet-status', selector);
    this.statusItem.command = ShowClientActions;

    this.renderNoClientHost();

    const clientHandler = (clientHost: SorbetClientHost) =>
      this.handleEditorOrStatusChange(clientHost);
    const withClientHandler = ({ clientHost }: { clientHost: SorbetClientHost }) =>
      this.handleEditorOrStatusChange(clientHost);

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

  public dispose(): void {
    this.cleanupClientHost();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  private get alwaysShowStatusItem(): boolean {
    return this.context.configuration.getValue('alwaysShowStatusItems', false);
  }

  private cleanupClientHost(): void {
    if (this.currentClientHost) {
      for (const disposable of this.currentClientHost.disposables) {
        disposable.dispose();
      }
      this.currentClientHost = undefined;
    }
  }

  private getSelector(): vscode.DocumentSelector {
    return this.alwaysShowStatusItem
      ? '*'
      : DOCUMENT_SELECTOR.concat(SORBET_CONFIG_DOCUMENT_SELECTOR);
  }

  private handleEditorOrStatusChange(clientOrContextUri?: SorbetClientHost | vscode.Uri) {
    let clientHost: SorbetClientHost | undefined;
    if (clientOrContextUri instanceof SorbetClientHost) {
      clientHost = clientOrContextUri;
    } else if (this.context.clientManager.clientCount === 1) {
      [clientHost] = this.context.clientManager.getClientHosts();
    } else {
      const contextUri = clientOrContextUri ?? mainAreaActiveEditorUri();
      clientHost = contextUri && this.context.clientManager.getClientHost(contextUri);
    }

    if (clientHost) {
      if (this.currentClientHost?.clientHost !== clientHost) {
        this.cleanupClientHost();
        this.currentClientHost = {
          clientHost,
          disposables: [clientHost.onStatusChanged(({ clientHost }) => this.render(clientHost))],
        };
      }
      this.render(clientHost);
    } else {
      this.cleanupClientHost();
      this.renderNoClientHost();
    }
  }

  private render(clientHost: SorbetClientHost) {
    const {
      configuration: { lspConfigurationType },
      operations,
    } = clientHost;
    this.setConfig({ clientHost, configType: lspConfigurationType });

    if (clientHost.status !== SorbetClientHostStatus.Error && operations.length > 0) {
      this.setStatus({
        clientHost,
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (clientHost.status) {
        case SorbetClientHostStatus.Disabled:
          this.setStatus({
            clientHost,
            severity: vscode.LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case SorbetClientHostStatus.Error:
          this.setStatus({
            clientHost,
            detail:
              'Sorbet language server encountered an error. See the Output panel for details.',
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Error',
          });
          break;
        case SorbetClientHostStatus.Initializing:
          this.setStatus({
            clientHost,
            busy: true,
            detail: 'Starting up Sorbet language server …',
            status: 'Initializing',
          });
          break;
        case SorbetClientHostStatus.Running:
          this.setStatus({ clientHost, status: 'Idle' });
          break;
        default:
          this.context.log.error('Invalid ServerStatus', clientHost.status);
          this.setStatus({
            clientHost,
            detail: `Unknown Status: ${clientHost.status}`,
            severity: vscode.LanguageStatusSeverity.Error,
            status: 'Unknown',
          });
          break;
      }
    }
  }

  private renderNoClientHost() {
    this.setConfig({ configType: LspConfigurationType.Disabled });
    this.setStatus({ status: 'Disabled' });
  }

  private setConfig(options: {
    clientHost?: SorbetClientHost;
    configType?: LspConfigurationType;
  }): void {
    const { configType } = options;
    const titleCasedConfig = configType
      ? configType.charAt(0).toUpperCase() + configType.slice(1)
      : '';

    this.configItem.detail = this.getWorkspaceAwareDetail(
      'Sorbet Configuration',
      options.clientHost,
    );
    this.configItem.text = `$(ruby) ${titleCasedConfig}`;
  }

  private setStatus(options: {
    clientHost?: SorbetClientHost;
    busy?: boolean;
    detail?: string;
    severity?: vscode.LanguageStatusSeverity;
    status?: string;
  }): void {
    this.statusItem.busy = Boolean(options.busy);
    this.statusItem.detail = options.clientHost?.isEnabledByConfiguration()
      ? (options.detail ?? this.getWorkspaceAwareDetail('Sorbet Status', options.clientHost))
      : 'Sorbet is disabled in settings';
    this.statusItem.severity = options.severity ?? vscode.LanguageStatusSeverity.Information;
    this.statusItem.text = `$(ruby) ${options.status ?? 'Unknown'}`;
  }

  private getWorkspaceAwareDetail(
    prefix: string,
    clientHost?: SorbetClientHost,
  ): string | undefined {
    return clientHost && this.context.clientManager.clientCount > 1
      ? `${prefix} (${clientHost.workspaceFolder.name})`
      : prefix;
  }
}
