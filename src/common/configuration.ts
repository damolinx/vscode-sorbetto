import * as vscode from 'vscode';
import { EXTENSION_PREFIX } from '../constants';

export function getConfiguration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
}

export function getValue<T>(section: string, defaultValue: T, configuration = getConfiguration()): T {
  return configuration.get(section, defaultValue);
}
