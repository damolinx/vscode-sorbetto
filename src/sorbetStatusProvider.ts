import * as vscode from 'vscode';
import { SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SorbetClient } from './sorbetClient';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus } from './types';

export interface SorbetClientEvent {
  readonly client: SorbetClient;
}

export interface ShowOperationEvent extends SorbetClientEvent {
  readonly operationParams: SorbetShowOperationParams;
}

export class SorbetStatusProvider implements vscode.Disposable {
  private readonly clientEventDisposables: vscode.Disposable[];
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private operationStack: SorbetShowOperationParams[];
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<SorbetClientEvent>;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.clientEventDisposables = [];
    this.operationStack = [];
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      this.context.clientManager.onClientChanged((client) => {
        this.disposeClientEventDisposables();
        if (client) {
          this.clientEventDisposables.push(
            client.onShowOperationNotification((params) =>
              this.fireOnShowOperation(client, params),
            ),
            client.onStatusChanged((_status) => this.fireOnStatusChanged(client)),
          );
        }
      }),
      { dispose: () => this.disposeClientEventDisposables() },
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  disposeClientEventDisposables(): void {
    vscode.Disposable.from(...this.clientEventDisposables).dispose();
    this.clientEventDisposables.length = 0;
  }

  /**
   * Raise {@link onShowOperation} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified. Spurious events are filtered out.
   */
  private fireOnShowOperation(
    client: SorbetClient,
    operationParams: SorbetShowOperationParams,
  ): void {
    let changed = false;
    if (operationParams.status === 'end') {
      const filteredOps = this.operationStack.filter(
        (otherP) => otherP.operationName !== operationParams.operationName,
      );
      if (filteredOps.length !== this.operationStack.length) {
        this.operationStack = filteredOps;
        changed = true;
      }
    } else {
      this.operationStack.push(operationParams);
      changed = true;
    }

    if (changed) {
      this.onShowOperationEmitter.fire({ client, operationParams });
    }
  }

  /**
   * Raise {@link onServerStatusChanged} event. Prefer this over calling
   * {@link EventEmitter.fire} directly so known state is updated before
   * event listeners are notified.
   */
  private fireOnStatusChanged(client: SorbetClient): void {
    if (!client || client.status === ServerStatus.DISABLED) {
      this.operationStack = [];
    }
    this.onStatusChangedEmitter.fire({ client });
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
  public get onShowOperation(): vscode.Event<ShowOperationEvent> {
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event raised on {@link ServerStatus status} changes.
   */
  public get onStatusChanged(): vscode.Event<SorbetClientEvent> {
    return this.onStatusChangedEmitter.event;
  }

  /**
   * Return current {@link ServerStatus server status}.
   */
  public get serverStatus(): ServerStatus {
    return this.context.clientManager.sorbetClient?.status || ServerStatus.DISABLED;
  }
}
