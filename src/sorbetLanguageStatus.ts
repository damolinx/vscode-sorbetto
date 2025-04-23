import { Disposable, languages, LanguageStatusItem, LanguageStatusSeverity } from 'vscode';
import { SHOW_ACTIONS_COMMAND_ID } from './commandIds';
import { LspConfigType } from './configuration';
import { SORBET_DOCUMENT_SELECTOR } from './languageClient';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { StatusChangedEvent } from './sorbetStatusProvider';
import { ServerStatus } from './types';

export class SorbetLanguageStatus implements Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposables: Disposable[];
  private serverStatus: ServerStatus;

  private readonly configItem: LanguageStatusItem;
  private readonly statusItem: LanguageStatusItem;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.serverStatus = ServerStatus.DISABLED;

    this.configItem = languages.createLanguageStatusItem(
      'ruby-sorbet-config',
      SORBET_DOCUMENT_SELECTOR);
    this.configItem.command = {
      arguments: ['sorbetto.sorbetLsp'],
      command: 'workbench.action.openSettings',
      title: 'Open Settings',
    };
    this.configItem.text = 'Sorbet Configuration';

    this.statusItem = languages.createLanguageStatusItem(
      'ruby-sorbet-status',
      SORBET_DOCUMENT_SELECTOR);
    this.statusItem.command = {
      command: SHOW_ACTIONS_COMMAND_ID,
      title: 'Actions',
      tooltip: 'Show available actions',
    };
    this.statusItem.text = 'Sorbet';

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
    const statusItem = this.statusItem;
    const configItem = this.configItem;
    const { lspConfig } = this.context.configuration;
    const { operations } = this.context.statusProvider;
    setConfig(lspConfig?.type);

    if (this.serverStatus !== ServerStatus.ERROR && operations.length > 0) {
      setStatus({
        busy: true,
        status: operations.at(-1)?.description,
      });
    } else {
      switch (this.serverStatus) {
        case ServerStatus.DISABLED:
          setStatus({
            severity: LanguageStatusSeverity.Warning,
            status: 'Disabled',
          });
          break;
        case ServerStatus.ERROR:
          setStatus({
            detail: this.context.statusProvider.serverError,
            severity: LanguageStatusSeverity.Error,
            status: 'Error',
          });
          break;
        case ServerStatus.INITIALIZING:
          setStatus({
            busy: true,
            status: 'Initializing',
          });
          break;
        case ServerStatus.RESTARTING:
          setStatus({
            busy: true,
            detail: 'Sorbet is restarting',
            status: 'Initializing',
          });
          break;
        case ServerStatus.RUNNING:
          setStatus({ status: 'Idle' });
          break;
        default:
          this.context.log.error('Invalid ServerStatus', this.serverStatus);
          setStatus({
            detail: `Unknown Status: ${this.serverStatus}`,
            severity: LanguageStatusSeverity.Error,
            status: 'Unknown',
          });
          break;
      }
    }

    function setConfig(configType?: LspConfigType) {
      if (configType) {
        configItem.text = configType.charAt(0).toUpperCase() + configType.slice(1);
        configItem.detail = 'Sorbet Configuration';

      } else {
        configItem.text = 'Sorbet';
        configItem.detail = 'No Sorbet Configuration';
      }
    }

    function setStatus(options: { busy?: boolean, detail?: string, severity?: LanguageStatusSeverity, status?: string }) {
      statusItem.busy = options?.busy ?? false;
      statusItem.detail = options?.detail ?? (options?.status && 'Sorbet Status');
      statusItem.severity = options?.severity ?? LanguageStatusSeverity.Information;
      statusItem.text = options?.status ?? 'Unknown';
    }
  }
}
