import * as vscode from 'vscode';
import { Client } from './client';
import { SorbetShowOperationParams } from './lsp/showOperationNotification';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { LspStatus } from './types';

export interface StatusChangedEvent {
  readonly client?: Client;
  readonly status: LspStatus;
}

export interface ShowOperationEvent {
  readonly client: Client;
  readonly operationParams: SorbetShowOperationParams;
}

export class SorbetStatusProvider implements vscode.Disposable {
  private readonly clientEventDisposables: vscode.Disposable[];
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private operationStack: SorbetShowOperationParams[];
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;

  constructor(context: SorbetExtensionContext) {
    this.context = context;
    this.clientEventDisposables = [];
    this.operationStack = [];
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
      this.context.clientManager.onClientAdded((client) => {
        this.clientEventDisposables.push(
          client.onShowOperationNotification(({ params }) =>
            this.fireOnShowOperation(client, params),
          ),
          client.onStatusChanged((_status) => this.fireOnStatusChanged(client)),
        );
      }),
      this.context.clientManager.onClientRemoved((_client) => {
        // TODO: Unsubscribe from client events
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
  private fireOnShowOperation(client: Client, operationParams: SorbetShowOperationParams): void {
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
  private fireOnStatusChanged(client?: Client): void {
    if (!client || client.status === LspStatus.Disabled) {
      this.operationStack = [];
    }
    this.onStatusChangedEmitter.fire({ client, status: client?.status ?? LspStatus.Disabled });
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
   * Event raised on {@link LspStatus status} changes.
   */
  public get onStatusChanged(): vscode.Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
  }

  /**
   * Return current {@link LspStatus server status}.
   */
  public getServerStatus(uri: vscode.Uri): LspStatus {
    return this.context.clientManager.getClient(uri)?.status || LspStatus.Disabled;
  }

  /**
   * All active Sorbet server statuses.
   */
  public getServerStatuses(): { status: LspStatus; workspace: vscode.Uri }[] {
    return this.context.clientManager.getClients().map((client) => ({
      status: client.status,
      workspace: client.workspaceFolder.uri,
    }));
  }
}
