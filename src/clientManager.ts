import * as vscode from 'vscode';
import { Client, ClientId, createClientId } from './client';
import { debounce } from './common/utils';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { isSorbetWorkspace } from './workspaceUtils';

export class ClientManager implements vscode.Disposable {
  private readonly clients: Map<ClientId, Client>;
  private readonly context: SorbetExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onClientAddedEmitter: vscode.EventEmitter<Client>;
  private readonly onClientRemovedEmitter: vscode.EventEmitter<Client>;

  constructor(context: SorbetExtensionContext) {
    this.clients = new Map();
    this.context = context;
    this.onClientAddedEmitter = new vscode.EventEmitter();
    this.onClientRemovedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onClientAddedEmitter,
      this.onClientRemovedEmitter,
      vscode.window.onDidChangeActiveTextEditor(
        debounce(async (editor) => {
          if (editor?.document.languageId !== 'ruby') {
            return;
          }
          const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
          if (!workspaceFolder) {
            return;
          }
          await this.addWorkspace(workspaceFolder);
        }),
      ),
      vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        event.removed.forEach((folder) => this.removeWorkspace(folder));
        await Promise.allSettled(event.added.map((folder) => this.addWorkspace(folder)));
      }),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables, ...this.clients.values()).dispose();
    this.clients.clear();
  }

  public async addWorkspace(
    workspaceFolder: vscode.WorkspaceFolder,
    clientId = createClientId(workspaceFolder),
  ): Promise<boolean> {
    if (this.clients.has(clientId)) {
      return false;
    }
    if (!(await isSorbetWorkspace(workspaceFolder))) {
      return false;
    }
    const client = new Client(this.context, workspaceFolder);
    this.clients.set(clientId, client);
    this.onClientAddedEmitter.fire(client);
    await client.start();
    return true;
  }

  public getClient(uri: vscode.Uri): Client | undefined {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return undefined;
    }
    const clientId = createClientId(workspaceFolder);
    return this.clients.get(clientId);
  }

  public getClients(): Client[] {
    return [...this.clients.values()];
  }

  public get onClientAdded(): vscode.Event<Client> {
    return this.onClientAddedEmitter.event;
  }

  public get onClientRemoved(): vscode.Event<Client> {
    return this.onClientRemovedEmitter.event;
  }

  public removeWorkspace(
    workspaceFolder: vscode.WorkspaceFolder,
    clientId = createClientId(workspaceFolder),
  ): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.dispose();
      this.clients.delete(clientId);
      this.onClientRemovedEmitter.fire(client);
      return true;
    }
    return false;
  }
}
