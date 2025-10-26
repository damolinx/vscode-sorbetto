import * as vscode from 'vscode';
import { onMainAreaActiveTextEditorChanged } from '../common/utils';
import { ExtensionContext } from '../extensionContext';
import { isSorbetWorkspace } from '../workspaceUtils';
import { ShowOperationEvent } from './showOperationEvent';
import { SorbetClient } from './sorbetClient';
import { createClientId, SorbetClientId } from './sorbetClientId';
import { StatusChangedEvent } from './statusChangedEvent';

export class SorbetClientManager implements vscode.Disposable {
  private readonly clients: Map<SorbetClientId, SorbetClient>;
  private readonly context: ExtensionContext;
  private readonly disposables: vscode.Disposable[];
  private readonly onClientAddedEmitter: vscode.EventEmitter<SorbetClient>;
  private readonly onClientRemovedEmitter: vscode.EventEmitter<SorbetClient>;
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;

  constructor(context: ExtensionContext) {
    this.clients = new Map();
    this.context = context;
    this.onClientAddedEmitter = new vscode.EventEmitter();
    this.onClientRemovedEmitter = new vscode.EventEmitter();
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onClientAddedEmitter,
      this.onClientRemovedEmitter,
      this.onClientAdded((client) => {
        client.onShowOperationNotification((e) => this.onShowOperationEmitter.fire(e));
        client.onStatusChanged((e) => this.onStatusChangedEmitter.fire(e));
      }),
      onMainAreaActiveTextEditorChanged(async (editor) => {
        if (editor?.document.languageId !== 'ruby') {
          return;
        }
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!workspaceFolder) {
          return;
        }
        await this.addWorkspace(workspaceFolder);
      }),
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
    const client = new SorbetClient(clientId, this.context, workspaceFolder);
    this.clients.set(clientId, client);
    this.onClientAddedEmitter.fire(client);
    await client.start();
    return true;
  }

  public get clientCount(): number {
    return this.clients.size;
  }

  public getClient(uri: vscode.Uri): SorbetClient | undefined {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return undefined;
    }
    return this.getClientById(createClientId(workspaceFolder));
  }

  public getClientById(clientId: SorbetClientId) {
    return this.clients.get(clientId);
  }

  public getClients(): SorbetClient[] {
    return [...this.clients.values()];
  }

  public get onClientAdded(): vscode.Event<SorbetClient> {
    return this.onClientAddedEmitter.event;
  }

  public get onClientRemoved(): vscode.Event<SorbetClient> {
    return this.onClientRemovedEmitter.event;
  }

  /**
   * Event raised on a {@link SorbetShowOperationParams show-operation} notification.
   */
  public get onShowOperation(): vscode.Event<ShowOperationEvent> {
    return this.onShowOperationEmitter.event;
  }

  /**
   * Event raised on {@link LspStatus status} changes.
   */
  public get onStatusChanged(): vscode.Event<StatusChangedEvent> {
    return this.onStatusChangedEmitter.event;
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
