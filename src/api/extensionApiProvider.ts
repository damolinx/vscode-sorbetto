import * as vscode from 'vscode';
import { SorbetClientManager } from '../lspClient/sorbetClientManager';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ExtensionApi } from './extensionApi';
import { mapStatus, SorbetStatus } from './status';
import { StatusChangedEvent } from './statusChangedEvent';

export function createExtensionApi(context: SorbetExtensionContext): ExtensionApi {
  const provider = new ExtensionApiProvider(context);
  context.extensionContext.subscriptions.push(provider);
  return provider.toApi();
}

/**
 * {@link ExtensionApi Extension API } provider.
 */
export class ExtensionApiProvider implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;
  private readonly clientManager: SorbetClientManager;

  constructor({ clientManager }: SorbetExtensionContext) {
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.clientManager = clientManager;
    this.disposables = [
      this.onStatusChangedEmitter,
      clientManager.onStatusChanged(({ status, client }) => {
        this.onStatusChangedEmitter.fire({
          status: mapStatus(status) ?? SorbetStatus.Disabled,
          workspace: client?.workspaceFolder?.uri,
        });
      }),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  /**
   * Public API.
   */
  public toApi(): ExtensionApi {
    return {
      onStatusChanged: this.onStatusChangedEmitter.event,
      statuses: this.clientManager.getClients().map(({ status, workspaceFolder }) => ({
        status: mapStatus(status) ?? SorbetStatus.Disabled,
        workspace: workspaceFolder.uri,
      })),
    };
  }
}
