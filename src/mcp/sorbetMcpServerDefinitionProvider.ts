import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { SorbetClientId } from '../lspClient/sorbetClientId';
import { McpLspBridgeServer } from './mcpLspBridgeServer';

export interface SorbetMcpServerDefinition extends vscode.McpStdioServerDefinition {
  clientId: SorbetClientId;
}

export class SorbetMcpServerDefinitionProvider
  implements vscode.McpServerDefinitionProvider<SorbetMcpServerDefinition>, vscode.Disposable {
  private readonly context: ExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onDidChangeMcpServerDefinitionsEventEmitter: vscode.EventEmitter<void>;
  private readonly clientToServer: Map<SorbetClientId, McpLspBridgeServer>;

  constructor(context: ExtensionContext) {
    this.context = context;
    this.onDidChangeMcpServerDefinitionsEventEmitter = new vscode.EventEmitter();
    this.clientToServer = new Map();

    this.disposables = [
      this.context.clientManager.onClientAdded(() =>
        this.onDidChangeMcpServerDefinitionsEventEmitter.fire(),
      ),
      this.context.clientManager.onClientRemoved(({ id }) => {
        const server = this.clientToServer.get(id);
        if (server) {
          server.dispose();
          this.clientToServer.delete(id);
        }
        this.onDidChangeMcpServerDefinitionsEventEmitter.fire();
      }),
      this.onDidChangeMcpServerDefinitionsEventEmitter,
    ];
  }

  public dispose(): void {
    vscode.Disposable.from(...this.disposables, ...this.clientToServer.values()).dispose();
  }

  public get onDidChangeMcpServerDefinitions(): vscode.Event<void> {
    return this.onDidChangeMcpServerDefinitionsEventEmitter.event;
  }

  provideMcpServerDefinitions(_token: vscode.CancellationToken): SorbetMcpServerDefinition[] {
    return this.context.clientManager.getClients().map(
      (client) =>
        ({
          args: [],
          env: process.env,
          clientId: client.id,
          command: process.execPath, // node
          label: `Sorbet (${client.workspaceFolder.name})`,
          version: this.context.extensionContext.extension.packageJSON.version,
        }) as SorbetMcpServerDefinition,
    );
  }

  async resolveMcpServerDefinition?(
    serverDef: SorbetMcpServerDefinition,
    _token: vscode.CancellationToken,
  ): Promise<SorbetMcpServerDefinition | undefined> {
    let server = this.clientToServer.get(serverDef.clientId);
    if (server) {
      this.context.log.debug(
        'SorbetMcpServerDefinitionProvider: MCP Server already running, ignoring resolveMcpServerDefinition request',
        serverDef.clientId,
        server.host,
        server.port,
      );
      return;
    }

    server = new McpLspBridgeServer(this.context, serverDef.clientId);
    this.clientToServer.set(serverDef.clientId, server);
    await server.open();

    serverDef.args = [
      this.context.extensionContext.asAbsolutePath('resources/mcp/mcpBridge.js'), // TODO: Move or make configurable
      '--register',
      `${serverDef.clientId}@${server.host}:${server.port}`,
    ];
    this.context.log.debug('SorbetMcpServerDefinitionProvider: MCP Server resolveMcpServerDefinition request', serverDef.args, process.execPath);

    return serverDef;
  }
}
