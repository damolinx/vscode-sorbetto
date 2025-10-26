import * as vscode from 'vscode';
import { SorbetStatus } from './status';
import { StatusChangedEvent } from './statusChangedEvent';

/**
 * API exposed by the extension to other extensions.
 */
export interface ExtensionApi {
  readonly onStatusChanged?: vscode.Event<StatusChangedEvent>;
  readonly statuses?: { status: SorbetStatus; workspace: vscode.Uri }[];
}
