import * as vscode from 'vscode';
import { SorbetStatus } from './status';
import { StatusChangedEvent } from './statusChangedEvent';

/**
 * API exposed by the extension to other extensions. This should be
 * fwd/bwd compatible to prevent breaking any external inetgration.
 */
export interface ExtensionApi {
  readonly onStatusChanged?: vscode.Event<StatusChangedEvent>;
  readonly statuses?: { status: SorbetStatus; workspace: vscode.Uri }[];
}
