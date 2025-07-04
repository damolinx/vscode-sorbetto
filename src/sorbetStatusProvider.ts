import { Disposable, Event, EventEmitter } from 'vscode';
import { SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus } from './types';
import { SorbetLanguageClient } from './sorbetLanguageClient';

export class SorbetStatusProvider implements Disposable {
  private readonly clientEventDisposables: Disposable[];
  private readonly context: SorbetExtensionContext;
  private readonly disposables: Disposable[];
  private operationStack: SorbetShowOperationParams[];
  private readonly onShowOperationEmitter: EventEmitter<SorbetShowOperationParams>;
  private readonly onStatusChangedEmitter: EventEmitter<ServerStatus>;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.clientEventDisposables = [];
    this.operationStack = [];
    this.onShowOperationEmitter = new EventEmitter();
    this.onStatusChangedEmitter = new EventEmitter();

    this.disposables = [
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      this.context.clientManager.onClientChanged((client) => {
        this.disposeClientEventDisposables();
        if (client) {
          this.clientEventDisposables.push(
            client.onShowOperationNotification((params) => this.fireOnShowOperation(params)),
            client.onStatusChange((status) => this.fireOnStatusChanged(client, status)),
          );
        }
      }),
      { dispose: () => this.disposeClientEventDisposables() },
    ];
  }

  dispose(): void {
    Disposable.from(...this.disposables).dispose();
  }

  disposeClientEventDisposables(): void {
    Disposable.from(...this.clientEventDisposables).dispose();
    this.clientEventDisposables.length = 0;
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
  private fireOnStatusChanged(client: SorbetLanguageClient, status: ServerStatus): void {
    if (client.status === ServerStatus.DISABLED) {
      this.operationStack = [];
    }
    this.onStatusChangedEmitter.fire(status);
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
  public get onStatusChanged(): Event<ServerStatus> {
    return this.onStatusChangedEmitter.event;
  }
}
