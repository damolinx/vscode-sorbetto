import { Disposable } from 'vscode-languageclient';
import { InitializationOptions } from './initializationOptions';

export const NOTIFICATION_METHOD = 'workspace/didChangeConfiguration';

/**
 * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification
 */
export interface WorkspaceDidChangeConfigurationNotification {
  onNotification(
    method: typeof NOTIFICATION_METHOD,
    handler: (params: InitializationOptions) => void):
    Disposable;
}