import { Disposable, languages, LanguageStatusItem, LanguageStatusSeverity } from 'vscode';
import { SHOW_ACTIONS_COMMAND_ID } from './commandIds';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { StatusChangedEvent } from './sorbetStatusProvider';
import { RestartReason, ServerStatus } from './types';
import { SORBET_DOCUMENT_SELECTOR } from './languageClient';

export class SorbetStatusBarEntry implements Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposable: Disposable;
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
      arguments: ['sorbetto.sorbetLspConfiguration'],
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

    this.disposable = Disposable.from(
      this.context.configuration.onDidChangeLspConfig(this.render, this),
      this.context.statusProvider.onStatusChanged(this.onServerStatusChanged, this),
      this.context.statusProvider.onShowOperation(this.render, this),
      this.configItem,
      this.statusItem,
    );

    this.render();
  }

  /**
   * Dispose and free associated resources.
   */
  public dispose() {
    this.disposable.dispose();
  }

  private async onServerStatusChanged(e: StatusChangedEvent): Promise<void> {
    const isError =
      this.serverStatus !== e.status && e.status === ServerStatus.ERROR;
    this.serverStatus = e.status;
    this.render();
    if (isError) {
      this.statusItem.severity = LanguageStatusSeverity.Error;
      await this.context.statusProvider.restartSorbet(
        RestartReason.CRASH_EXT_ERROR,
      );
    }
  }

  private render() {
    const statusItem = this.statusItem;
    const { operations } = this.context.statusProvider;
    const { lspConfig } = this.context.configuration;

    this.configItem.detail = lspConfig?.type;

    // Errors should suppress operation animations / feedback.
    if (
      lspConfig &&
      this.serverStatus !== ServerStatus.ERROR &&
      operations.length > 0
    ) {
      const latestOp = operations[operations.length - 1];
      setStatus({ busy: true, detail: latestOp.description });
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
          setStatus({ busy: true, status: 'Initializing' });
          break;
        case ServerStatus.RESTARTING:
          setStatus({ busy: true, status: 'Initializing', detail: 'Sorbet is being restarted' });
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

    function setStatus(options: { busy?: boolean, detail?: string, severity?: LanguageStatusSeverity, status?: string }) {
      statusItem.busy = options?.busy ?? false;
      statusItem.detail = options?.detail;
      statusItem.severity = options?.severity ?? LanguageStatusSeverity.Information;
      statusItem.text = options?.status ? `Sorbet: ${options.status}` : 'Sorbet';
    }
  }
}
