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
      this.context.configuration.onDidChangeLspConfig(this.render, this),
      this.context.statusProvider.onStatusChanged(this.onServerStatusChanged, this),
      this.context.statusProvider.onShowOperation(this.render, this),
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
    const { lspConfig } = this.context.configuration;

    let text: string;
    let tooltip: string;
    // Errors should suppress operation animations / feedback.
    if (
      lspConfig &&
      this.serverStatus !== ServerStatus.ERROR &&
      operations.length > 0
    ) {
      const latestOp = operations[operations.length - 1];
      text = `$(sync~spin) Sorbet: ${latestOp.description}`;
      tooltip = 'The Sorbet server is currently running.';
    } else {
      let serverError: string | undefined;
      switch (this.serverStatus) {
        case ServerStatus.DISABLED:
          text = 'Sorbet: Disabled';
          tooltip = 'The Sorbet server is disabled.';
          break;
        case ServerStatus.ERROR:
          text = 'Sorbet: Error';
          tooltip = 'Click for remediation items.';
          serverError = this.context.statusProvider.serverError;
          if (serverError) {
            tooltip = `${serverError}\n${tooltip}`;
          }
          break;
        case ServerStatus.INITIALIZING:
            text = '$(sync~spin) Sorbet: Initializing';
          tooltip = 'The Sorbet server is initializing.';
          break;
        case ServerStatus.RESTARTING:
          text = '$(sync~spin) Sorbet: Restarting';
          tooltip = 'The Sorbet server is restarting.';
          break;
        case ServerStatus.RUNNING:
          text = 'Sorbet: Idle';
          tooltip = 'The Sorbet server is currently running.';
          break;
        default:
          this.context.log.error('Invalid ServerStatus', this.serverStatus);
          text = '';
          tooltip = '';
          break;
      }
    }

    if (tooltip && lspConfig?.type ) {
      tooltip += `Configuration: ${lspConfig?.type}`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
  }
}
