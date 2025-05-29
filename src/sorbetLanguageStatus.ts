import { Command, Disposable, languages, LanguageStatusItem, LanguageStatusSeverity, workspace } from 'vscode';
import { SHOW_OUTPUT_ID, SORBET_RESTART_ID } from './commandIds';
import { LspConfigType } from './configuration';
import { SORBET_DOCUMENT_SELECTOR } from './languageClient';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { StatusChangedEvent } from './sorbetStatusProvider';
import { ServerStatus } from './types';

const StartCommand: Command = {
  command: SORBET_RESTART_ID,
  title: 'Start',
  tooltip: 'Start Sorbet',
};

const ShowOutputCommand: Command = {
  command: SHOW_OUTPUT_ID,
  title: 'Output',
  tooltip: 'Show Sorbet Output',
};

export class SorbetLanguageStatus implements Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposables: Disposable[];
  private serverStatus: ServerStatus;

  private readonly configItem: LanguageStatusItem;
  private readonly statusItem: LanguageStatusItem;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.serverStatus = ServerStatus.DISABLED;

    this.configItem = languages.createLanguageStatusItem('ruby-sorbet-config', SORBET_DOCUMENT_SELECTOR);
    this.configItem.command = {
      arguments: ['sorbetto.sorbetLsp'],
      command: 'workbench.action.openWorkspaceSettings',
      title: 'Configure',
      tooltip: 'Open Sorbet Configuration Settings',
    };
    this.setConfig();

    this.statusItem = languages.createLanguageStatusItem('ruby-sorbet-status', SORBET_DOCUMENT_SELECTOR);
    this.setStatus({ status: 'Disabled', command: StartCommand });

    this.disposables = [
      this.context.configuration.onDidChangeLspConfig(this.render, this),
      this.context.statusProvider.onShowOperation(this.render, this),
      this.context.statusProvider.onStatusChanged(this.onServerStatusChanged, this),
      this.configItem,
      this.statusItem,
    ];
  }

  public dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  private onServerStatusChanged(e: StatusChangedEvent): void {
    this.serverStatus = e.status;
    this.render();
  }

  private render() {
    const { lspConfig } = this.context.configuration;
    const { operations } = this.context.statusProvider;
    this.setConfig(lspConfig?.type);

    if (this.serverStatus !== ServerStatus.ERROR && operations.length > 0) {
      this.setStatus({
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (this.serverStatus) {
        case ServerStatus.DISABLED:
          this.setStatus({
            command: StartCommand,
            severity: LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case ServerStatus.ERROR:
          this.setStatus({
            detail: this.context.statusProvider.serverError,
            severity: LanguageStatusSeverity.Error,
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
          this.context.log.error('Invalid ServerStatus', this.serverStatus);
          this.setStatus({
            detail: `Unknown Status: ${this.serverStatus}`,
            severity: LanguageStatusSeverity.Error,
            status: 'Unknown',
          });
          break;
      }
    }
  }

  private setConfig(configType?: LspConfigType) {
    const config = configType ?? workspace.getConfiguration().get('sorbetto.sorbetLspConfiguration', LspConfigType.Disabled);
    this.configItem.detail = 'Sorbet Configuration';
    this.configItem.text = config.charAt(0).toUpperCase() + config.slice(1);
  }

  private setStatus(options?: { busy?: boolean, command?: Command, detail?: string, severity?: LanguageStatusSeverity, status?: string }) {
    this.statusItem.busy = options?.busy ?? false;
    this.statusItem.command = options?.command ?? ShowOutputCommand;
    this.statusItem.detail = options?.detail ?? (options?.status && 'Sorbet Status');
    this.statusItem.severity = options?.severity ?? LanguageStatusSeverity.Information;
    this.statusItem.text = options?.status ?? 'Unknown';
  }
}
