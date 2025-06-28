
import * as vscode from 'vscode';
import { mapStatus } from '../api/sorbetStatus';
import { ServerStatus } from '../types';

export function setSorbetStatus(status: ServerStatus) {
  vscode.commands.executeCommand('setContext', 'sorbetto:sorbetStatus', mapStatus(status));
}