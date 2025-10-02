import * as vscode from 'vscode';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { SorbetStatusProvider } from '../sorbetStatusProvider';
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
  private readonly statusProvider: SorbetStatusProvider;

  constructor({ statusProvider }: SorbetExtensionContext) {
    this.onStatusChangedEmitter = new vscode.EventEmitter();
    this.statusProvider = statusProvider;
    this.disposables = [
      this.onStatusChangedEmitter,
      statusProvider.onStatusChanged(({ status, client }) => {
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
      statuses: this.statusProvider.getServerStatuses().map(({ status, workspace }) => ({
        status: mapStatus(status) ?? SorbetStatus.Disabled,
        workspace,
      })),
    };
  }
}
