import { Disposable, EventEmitter } from 'vscode';
import { ExtensionApi } from './extensionApi';
import { mapStatus, SorbetStatus } from './status';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ServerStatus } from '../types';

/**
 * {@link ExtensionApi Extension API } provider.
 */
export class ExtensionApiProvider implements Disposable {
  private readonly disposables: Disposable[];
  private readonly onStatusChangedEmitter: EventEmitter<SorbetStatus>;
  private status?: SorbetStatus;

  constructor({ statusProvider }: SorbetExtensionContext) {
    this.onStatusChangedEmitter = new EventEmitter();
    this.status = mapStatus(ServerStatus.DISABLED); //TODO:

    this.disposables = [
      this.onStatusChangedEmitter,
      statusProvider.onStatusChanged((status) => {
        const mappedStatus = mapStatus(status);
        if (mappedStatus && this.status !== mappedStatus) {
          this.onStatusChangedEmitter.fire(mappedStatus);
        }
      }),
    ];
  }

  dispose(): void {
    Disposable.from(...this.disposables).dispose();
  }

  /**
   * Public API.
   */
  public toApi(): ExtensionApi {
    return {
      onStatusChanged: this.onStatusChangedEmitter.event,
      status: this.status,
    };
  }
}
