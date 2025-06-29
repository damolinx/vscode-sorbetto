import { Disposable, NotificationHandler } from 'vscode-languageclient';

export const SHOW_OPERATION_NOTIFICATION_METHOD = 'sorbet/showOperation';

export type OperationStatus = 'start' | 'end';

export interface SorbetShowOperationParams {
  /**
   * A stable identifier for this operation.
   */
  operationName: string;
  /**
   * An unstable, human-readable description of a given operation.
   */
  description: string;
  /**
   * Whether operation is starting or ending, so the language client
   * can track overlapping operations.
   */
  status: OperationStatus;
}

/**
 * See https://sorbet.org/docs/lsp#sorbetshowoperation-notification
 */
export interface ShowOperationNotification {
  onNotification(
    method: typeof SHOW_OPERATION_NOTIFICATION_METHOD,
    handler: NotificationHandler<SorbetShowOperationParams>):
    Disposable;
}