import { Disposable, Event, EventEmitter } from 'vscode';
import { SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus } from './types';

export interface StatusChangedEvent {
  status: ServerStatus;
  stopped?: true;
  error?: string;
}

export class SorbetStatusProvider implements Disposable {
  private readonly context: SorbetExtensionContext;
  private readonly disposables: Disposable[];
  private operationStack: SorbetShowOperationParams[];
  private readonly onShowOperationEmitter: EventEmitter<SorbetShowOperationParams>;
  private readonly onStatusChangedEmitter: EventEmitter<StatusChangedEvent>;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.operationStack = [];
    this.onShowOperationEmitter = new EventEmitter();
    this.onStatusChangedEmitter = new EventEmitter();

    this.disposables = [
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      this.context.clientManager.onClientChanged((client) => {
        if (client) {
          client.onShowOperationNotification((params: SorbetShowOperationParams) =>
            this.fireOnShowOperation(params));
          client.onStatusChange((status: ServerStatus) =>
            this.fireOnStatusChanged({ status, error: client.lastError?.msg }),
          );
        }
      }),
    ];
  }

  public dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  /**
   * Raise {@link onShowOperation} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified. Spurious events are filtered out.
   */
  private fireOnShowOperation(data: SorbetShowOperationParams): void {
    let changed = false;
    if (data.status === 'end') {
      const filteredOps = this.operationStack.filter(
        (otherP) => otherP.operationName !== data.operationName,
      );
      if (filteredOps.length !== this.operationStack.length) {
        this.operationStack = filteredOps;
        changed = true;
      }
    } else {
      this.operationStack.push(data);
      changed = true;
    }

    if (changed) {
      this.onShowOperationEmitter.fire(data);
    }
  }

  /**
   * Raise {@link onServerStatusChanged} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified.
   */
  private fireOnStatusChanged(data: StatusChangedEvent): void {
    const { sorbetClient } = this.context.clientManager;
    if (!sorbetClient || sorbetClient.status === ServerStatus.DISABLED) {
      this.operationStack = [];
    }
    this.onStatusChangedEmitter.fire(data);
  }

  /**
   * Sorbet client current operation stack.
   */
  public get operations(): readonly Readonly<SorbetShowOperationParams>[] {
    return this.operationStack;
  }

  /**
   * Event raised on a {@link SorbetShowOperationParams show-operation} notification.
   */
  public get onShowOperation(): Event<SorbetShowOperationParams> {
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event raised on {@link ServerStatus status} changes.
   */
  public get onStatusChanged(): Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
  }

  /**
   * Return current {@link ServerStatus server status}.
   */
  public get serverStatus(): ServerStatus {
    return this.context.clientManager.sorbetClient?.status || ServerStatus.DISABLED;
  }
}
