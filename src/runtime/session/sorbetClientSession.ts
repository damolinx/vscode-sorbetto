import * as vscode from 'vscode';
import { SorbetClient } from '../../client/sorbetClient';
import {
  SHOW_OPERATION_NOTIFICATION_METHOD,
  SorbetShowOperationParams,
} from '../../client/spec/showOperationNotification';
import { StatusChangedEvent } from './events/statusChangedEvent';
import {
  convertToClientSessionStatus,
  SorbetClientSessionStatus,
} from './sorbetClientSessionStatus';

export class SorbetClientSession implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly onShowOperationEmitter: vscode.EventEmitter<SorbetShowOperationParams>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;

  constructor(
    public readonly client: SorbetClient,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.disposables = [
      this.client,
      this.client.onDidChangeState((event) => {
        const eventArgs: StatusChangedEvent = {
          status: convertToClientSessionStatus(event.newState),
          oldStatus: convertToClientSessionStatus(event.oldState),
          session: this,
        };
        this.log.trace(`Client state changed: ${eventArgs.oldStatus} -> ${eventArgs.status}`);
        this.onStatusChangedEmitter.fire(eventArgs);
      }),
      this.client.onNotification(SHOW_OPERATION_NOTIFICATION_METHOD, (params) => {
        this.log.trace(`Received show operation notification: ${JSON.stringify(params)}`);
        this.onShowOperationEmitter.fire(params);
      }),
      this.onShowOperationEmitter,
      this.onStatusChangedEmitter,
    ];
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  public get onShowOperation(): vscode.Event<SorbetShowOperationParams> {
    return this.onShowOperationEmitter.event;
  }

  public get onStatusChanged(): vscode.Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
  }

  public get operations(): readonly SorbetShowOperationParams[] {
    return this.client.operations;
  }

  public get status(): SorbetClientSessionStatus {
    return convertToClientSessionStatus(this.client.state);
  }
}
