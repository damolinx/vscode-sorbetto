import * as vscode from 'vscode';
import { SorbetClient } from '../client/sorbetClient';
import { ShowOperationEvent } from '../clientHost/events/showOperationEvent';
import { StatusChangedEvent } from '../clientHost/events/statusChangedEvent';
import { SorbetClientHost } from '../clientHost/sorbetClientHost';
import { createClientHostId, SorbetClientHostId } from '../clientHost/sorbetClientHostId';
import { onMainAreaActiveTextEditorChanged } from '../common/utils';
import { isSorbetWorkspace } from '../common/workspaceUtils';
import { ExtensionContext } from '../extensionContext';

export class SorbetClientManager implements vscode.Disposable {
  private readonly clientHosts: Map<SorbetClientHostId, SorbetClientHost>;
  private readonly disposables: vscode.Disposable[];
  private readonly onClientAddedEmitter: vscode.EventEmitter<SorbetClientHost>;
  private readonly onClientRemovedEmitter: vscode.EventEmitter<SorbetClientHost>;
  private readonly onShowOperationEmitter: vscode.EventEmitter<ShowOperationEvent>;
  private readonly onStatusChangedEmitter: vscode.EventEmitter<StatusChangedEvent>;

  constructor(private readonly context: ExtensionContext) {
    this.clientHosts = new Map();
    this.onClientAddedEmitter = new vscode.EventEmitter();
    this.onClientRemovedEmitter = new vscode.EventEmitter();
    this.onShowOperationEmitter = new vscode.EventEmitter();
    this.onStatusChangedEmitter = new vscode.EventEmitter();

    this.disposables = [
      this.onClientAddedEmitter,
      this.onClientRemovedEmitter,
      this.onClientAdded((client) => {
        client.onShowOperation((e) => this.onShowOperationEmitter.fire(e));
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
        await this.ensureClientHost(workspaceFolder);
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        event.removed.forEach((folder) => this.removeWorkspace(folder));
        await Promise.allSettled(event.added.map((folder) => this.ensureClientHost(folder)));
      }),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables, ...this.clientHosts.values()).dispose();
    this.clientHosts.clear();
  }

  public get clientCount(): number {
    return this.clientHosts.size;
  }

  public async ensureClientHost(
    workspaceFolder: vscode.WorkspaceFolder,
    clientId = createClientHostId(workspaceFolder),
    start = true,
  ): Promise<SorbetClientHost | undefined> {
    let sorbetClient = this.clientHosts.get(clientId);
    if (!sorbetClient) {
      if (!(await isSorbetWorkspace(workspaceFolder))) {
        return undefined;
      }

      sorbetClient = new SorbetClientHost(this.context, workspaceFolder, clientId);
      this.clientHosts.set(clientId, sorbetClient);
      this.onClientAddedEmitter.fire(sorbetClient);
    }

    if (start) {
      await sorbetClient.start();
    }

    return sorbetClient;
  }

  public getClientHost(
    workspaceFolderOrUri: vscode.Uri | vscode.WorkspaceFolder,
  ): SorbetClientHost | undefined {
    let workspaceFolder: vscode.WorkspaceFolder | undefined;
    if (workspaceFolderOrUri instanceof vscode.Uri) {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceFolderOrUri);
      if (!workspaceFolder) {
        return undefined;
      }
    } else {
      workspaceFolder = workspaceFolderOrUri;
    }

    const hostId = createClientHostId(workspaceFolder);
    return this.clientHosts.get(hostId);
  }

  public getClients(): SorbetClient[] {
    return this.getClientHosts()
      .map((host) => host.languageClient)
      .filter((client) => !!client);
  }

  public getClientHosts(): SorbetClientHost[] {
    return [...this.clientHosts.values()];
  }

  public get onClientAdded(): vscode.Event<SorbetClientHost> {
    return this.onClientAddedEmitter.event;
  }

  public get onClientRemoved(): vscode.Event<SorbetClientHost> {
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
    clientId = createClientHostId(workspaceFolder),
  ): boolean {
    const client = this.clientHosts.get(clientId);
    if (client) {
      client.dispose();
      this.clientHosts.delete(clientId);
      this.onClientRemovedEmitter.fire(client);
      return true;
    }
    return false;
  }
}
