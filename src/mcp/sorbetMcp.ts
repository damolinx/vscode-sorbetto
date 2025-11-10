import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { SorbetMcpServerDefinitionProvider } from './sorbetMcpServerDefinitionProvider';

export function registerMcpComponents(context: ExtensionContext): void {
  if (typeof vscode.lm.registerMcpServerDefinitionProvider === 'undefined') {
    context.log.warn(
      'MCP components not enabled, missing API capabilities (VS Code 1.101+ required)',
    );
  }

  const provider = new SorbetMcpServerDefinitionProvider(context);
  vscode.lm.registerMcpServerDefinitionProvider('sorbetto.mcp.sorbet', provider);
}
