import { Disposable } from "vscode-languageclient";
import { InitializationOptions } from "./initializationOptions";

/**
 * See https://sorbet.org/docs/lsp#workspacedidchangeconfiguration-notification
 */
export interface WorkspaceDidChangeConfigurationNotification {
  onNotification(
    method: 'workspace/didChangeConfiguration',
    handler: (params: InitializationOptions) => void):
    Disposable;
}