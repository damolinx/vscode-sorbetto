import { Disposable, Event, EventEmitter } from 'vscode';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { mapStatus, SorbetStatus } from './sorbetStatus';

/**
 * Sorbet Extension API.
 *
 * !!! IMPORTANT !!!
 * Maintain backward and forward compatibility in all changes to this interface
 * to prevent breaking consumer extensions:
 *  1. Use optional properties.
 *  2. NEVER expose internal types directly.
 */
export interface SorbetExtensionApi {
  status?: SorbetStatus;
  readonly onStatusChanged?: Event<SorbetStatus>;
}

export class SorbetExtensionApiImpl implements Disposable {
  private readonly disposables: Disposable[];
  private readonly onStatusChangedEmitter: EventEmitter<SorbetStatus>;
  private status?: SorbetStatus;

  constructor({ statusProvider }: SorbetExtensionContext) {
    this.onStatusChangedEmitter = new EventEmitter();
    this.status = mapStatus(statusProvider.serverStatus);

    this.disposables = [
      this.onStatusChangedEmitter,
      statusProvider.onStatusChanged((e) => {
        const mappedStatus = mapStatus(e.status);
        if (mappedStatus && this.status !== mappedStatus) {
          this.onStatusChangedEmitter.fire(mappedStatus);
        }
      }),
    ];
  }

  public dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  /**
   * Public API.
   */
  public toApi(): SorbetExtensionApi {
    // API returned to other extensions should be specific not use `this` as
    // that would expose internal implementation, e.g. `onStatusChangedEmitter`.
    return {
      status: this.status,
      onStatusChanged: this.onStatusChangedEmitter.event,
    };
  }
}
