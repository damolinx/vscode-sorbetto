import { Disposable } from 'vscode-languageclient';

export const NOTIFICATION_METHOD = 'sorbet/showOperation';

export type OperationStatus = 'start' | 'end';

export interface ShowOperationParams {
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
    method: typeof NOTIFICATION_METHOD,
    handler: (params: ShowOperationParams) => void):
    Disposable;
}