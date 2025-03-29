import { Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { SHOW_ACTIONS_COMMAND_ID } from './commandIds';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { StatusChangedEvent } from './sorbetStatusProvider';
import { RestartReason, ServerStatus } from './types';

export class SorbetStatusBarEntry implements Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposable: Disposable;
  private serverStatus: ServerStatus;
  private readonly statusBarItem: StatusBarItem;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.serverStatus = ServerStatus.DISABLED;
    this.statusBarItem = window.createStatusBarItem(
      StatusBarAlignment.Left,
      10,
    );
    this.statusBarItem.command = SHOW_ACTIONS_COMMAND_ID;

    this.disposable = Disposable.from(
      this.context.configuration.onLspConfigChange(() => this.render()),
      this.context.statusProvider.onStatusChanged((e) =>
        this.onServerStatusChanged(e),
      ),
      this.context.statusProvider.onShowOperation((_params) => this.render()),
      this.statusBarItem,
    );

    this.render();
    this.statusBarItem.show();
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
      await this.context.statusProvider.restartSorbet(
        RestartReason.CRASH_EXT_ERROR,
      );
    }
  }

  private render() {
    const { operations } = this.context.statusProvider;
    const { activeLspConfig } = this.context.configuration;
    const sorbetName = activeLspConfig?.name ?? 'Sorbet';

    let text: string;
    let tooltip: string;
    // Errors should suppress operation animations / feedback.
    if (
      activeLspConfig &&
      this.serverStatus !== ServerStatus.ERROR &&
      operations.length > 0
    ) {
      const latestOp = operations[operations.length - 1];
      text = `$(sync~spin) ${sorbetName}: ${latestOp.description}`;
      tooltip = 'The Sorbet server is currently running.';
    } else {
      let serverError: string | undefined;
      switch (this.serverStatus) {
        case ServerStatus.DISABLED:
          text = `${sorbetName}: Disabled`;
          tooltip = 'The Sorbet server is disabled.';
          break;
        case ServerStatus.ERROR:
          text = `${sorbetName}: Error`;
          tooltip = 'Click for remediation items.';
          serverError = this.context.statusProvider.serverError;
          if (serverError) {
            tooltip = `${serverError}\n${tooltip}`;
          }
          break;
        case ServerStatus.INITIALIZING:
            text = `$(sync~spin) ${sorbetName}: Initializing`;
          tooltip = 'The Sorbet server is initializing.';
          break;
        case ServerStatus.RESTARTING:
          text = `$(sync~spin) ${sorbetName}: Restarting`;
          tooltip = 'The Sorbet server is restarting.';
          break;
        case ServerStatus.RUNNING:
          text = `${sorbetName}: Idle`;
          tooltip = 'The Sorbet server is currently running.';
          break;
        default:
          this.context.log.error('Invalid ServerStatus', this.serverStatus);
          text = '';
          tooltip = '';
          break;
      }
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
  }
}
