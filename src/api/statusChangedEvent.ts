import * as vscode from 'vscode';
import { SorbetStatus } from './status';

export interface StatusChangedEvent {
  readonly status: SorbetStatus;
  readonly workspace?: vscode.Uri;
}
