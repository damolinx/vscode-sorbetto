import * as vscode from 'vscode';
import * as net from 'net';
import { ExtensionContext } from '../extensionContext';
import { SorbetClient } from '../lspClient/sorbetClient';
import { SorbetClientId } from '../lspClient/sorbetClientId';

const MESSAGE_SEPARATOR = '\r\n\r\n';

function frame(obj: any): Buffer {
  const s = JSON.stringify(obj);
  return Buffer.from(
    `Content-Length: ${Buffer.byteLength(s, 'utf8')}${MESSAGE_SEPARATOR}${s}`,
    'utf8',
  );
}

export class McpLspBridgeServer implements vscode.Disposable {
  private readonly client: SorbetClient;
  private readonly context: ExtensionContext;
  public readonly host: string;
  private server?: net.Server;

  constructor(context: ExtensionContext, clientId: SorbetClientId, host = '127.0.0.1') {
    this.client = context.clientManager.getClientById(clientId)!;
    this.context = context;
    this.host = host;
  }

  public dispose(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }

  public get port() {
    const info = this.server?.address();
    return info && typeof info === 'object' && 'port' in info ? info.port : undefined;
  }

  public async open(): Promise<void> {
    if (this.server) {
      if (!this.server.listening) {
        throw new Error('Server is present but not listening');
      }
      return;
    }

    const { log } = this.context;
    this.server = net.createServer();
    this.server
      .on('close', () => {
        log.info(`McpLsp[${this.host}:${this.port}]: Closed`);
        this.server = undefined;
      })
      .on('connection', (socket) => this.setupSocket(socket))
      .on('error', (err) => log.error(`McpLsp[${this.host}:${this.port}]: Error`, err))
      .listen(0, this.host, () => log.info(`McpLsp[${this.host}:${this.port}]: Listening`));
  }

  private setupSocket(socket: net.Socket): void {
    const {
      client,
      context: { log },
    } = this;
    const { port, address } = socket.address() as net.AddressInfo;

    let buffer = Buffer.alloc(0);
    socket
      .on('close', () => log.debug(`McpLsp[${this.host}:${this.port}]: Socket closed`))
      .on('error', (err) => log.error(`McpLsp[${this.host}:${this.port}]: Socket error`, err))
      .on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        while (true) {
          const s = buffer.toString('utf8');
          const sep = s.indexOf(MESSAGE_SEPARATOR);
          if (sep === -1) {
            break;
          }

          const header = s.slice(0, sep);
          const m = /Content-Length:\s*(\d+)/i.exec(header);
          if (!m) {
            buffer = Buffer.alloc(0);
            break;
          }

          const len = parseInt(m[1], 10);
          const total = sep + 4 + len;
          if (buffer.length < total) {
            break;
          }

          const body = buffer.subarray(sep + 4, sep + 4 + len).toString('utf8');
          buffer = buffer.subarray(total);

          let msg: any;
          try {
            msg = JSON.parse(body);
          } catch (err) {
            log.trace(`McpLsp[${address}:${port}]: Socket error`, err);
            sendToBridge({
              jsonrpc: '2.0',
              method: 'mcp/log',
              params: { level: 'error', message: 'parse error' },
            });
            continue;
          }

          handleBridgeMessage(msg).catch((err) => {
            if (msg && msg.id) {
              sendToBridge({
                jsonrpc: '2.0',
                id: msg.id,
                error: { code: -32000, message: String(err) },
              });
            }
          });

          function sendToBridge(obj: any) {
            try {
              socket.write(frame(obj));
            } catch (err) {
              log.trace(`McpLsp[${address}:${port}]: Socket error`, err);
            }
          }

          async function handleBridgeMessage(msg: any) {
            if (!msg?.method) {
              return;
            }

            if (!client.languageClient) {
              if (msg.id) {
                sendToBridge({
                  jsonrpc: '2.0',
                  id: msg.id,
                  error: { code: -32601, message: 'LanguageClient not available' },
                });
              }
              return;
            }

            if (msg.id !== undefined) {
              try {
                const result = await client.languageClient.sendRequest(msg.method, msg.params);
                sendToBridge({ jsonrpc: '2.0', id: msg.id, result });
              } catch (err: any) {
                sendToBridge({
                  jsonrpc: '2.0',
                  id: msg.id,
                  error: {
                    code: err.code || -32000,
                    message: err.message || String(err),
                    data: err,
                  },
                });
              }
            } else {
              try {
                client.languageClient.sendNotification(msg.method, msg.params);
              } catch (err) {
                sendToBridge({
                  jsonrpc: '2.0',
                  method: 'mcp/log',
                  params: { level: 'error', message: `notification forward failed: ${err}` },
                });
              }
            }
          }
        }
      });
  }
}
