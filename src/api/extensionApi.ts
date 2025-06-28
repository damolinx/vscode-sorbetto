import { Event } from 'vscode';
import { SorbetStatus } from './status';

/**
 * API exposed by the extension to other extensions. This should be
 * fwd/bwd compatible to prevent breaking any external inetgration.
 */
export interface ExtensionApi {
  readonly onStatusChanged?: Event<SorbetStatus>;
  readonly status?: SorbetStatus;
}
