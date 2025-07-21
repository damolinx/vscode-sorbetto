import { DidChangeConfigurationParams, Disposable, NotificationHandler } from 'vscode-languageclient';
import { InitializationOptions } from './initializationOptions';

export const DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD = 'workspace/didChangeConfiguration';

export interface SorbetDidChangeConfigurationParams extends DidChangeConfigurationParams {
  settings: InitializationOptions;
}

/**
 * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification
 */
export interface WorkspaceDidChangeConfigurationNotification {
  onNotification(
    method: typeof DID_CHANGE_CONFIGURATION_NOTIFICATION_METHOD,
    handler: NotificationHandler<SorbetDidChangeConfigurationParams>
  ): Disposable;
}