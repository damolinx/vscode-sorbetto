#!/usr/bin/env node
'use strict';

// Minimal JSON-RPC over stdio MCP bridge
// Supports: initialize, ping, textDocument/didOpen, didChange, didClose,
// textDocument/hover, workspace/diagnostics (simple simulated), shutdown

const net = require('net');

let openDocs = new Map();
let startTime = Date.now();

// client registry: id -> { socket, leftover, nextId, pending: Map }
const clients = new Map();
// single-client mode: when true, bridge will accept only one registered client and exit on its close
const singleClientMode = process.argv.includes('--single-client') || process.env.MCP_SINGLE === '1';

// Parse startup registration args/env and auto-register clients
function parseStartupRegistrations() {
  const entries = [];

  // CLI: --register id@host:port (can appear multiple times)
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (!arg) {
      continue;
    }

    let clientInfo;
    if (arg === '--register') {
      if (process.argv[1 + 1]) {
        clientInfo = process.argv[1 + i++];
      }
    } else if (arg.startsWith('--register='))  {
      clientInfo = arg.split('=')[1];
    }

    if (!clientInfo) {
      continue;
    }

    // id@host:port
    const parsedClientInfo = clientInfo.match(/([^@]+)@([^:]+):(\d+)/);
    if (parsedClientInfo) {
      entries.push({ id: parsedClientInfo[1], host: parsedClientInfo[2], port: Number(parsedClientInfo[3]) });
    }    
  }

  return entries;
}

function send(obj) {
  const s = JSON.stringify(obj);
  process.stdout.write(s + '\n');
  // const header = `Content-Length: ${Buffer.byteLength(s, 'utf8')}\r\n\r\n`;
  // process.stdout.write(header + s);
}

function sendLog(kind, obj) {
  // Avoid logging mcp/log messages to prevent recursive spam
  try {
    if (obj && obj.method === 'mcp/log') {
      return;
    }
  } catch (e) {}
  const payload = { jsonrpc: '2.0', method: 'mcp/log', params: { level: 'debug', message: `${kind}: ${JSON.stringify(obj)}` } };
  const s = JSON.stringify(payload);
  process.stdout.write(s + '\n');
  //const header = `Content-Length: ${Buffer.byteLength(s, 'utf8')}\r\n\r\n`;
  //process.stdout.write(header + s);
}

function makeResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function makeError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function handleListTools(id, params) {
  const result = {
        "tools": [
      {
        "name": "get_hover",
        "description": "Get hover info for a symbol",
        "input": { "uri": "string", "position": { "line": "number", "character": "number" } },
        "output": { "contents": "string" }
      },
      {
        "name": "get_definition",
        "description": "Find symbol definition",
        "input": { "uri": "string", "position": { "line": "number", "character": "number" } },
        "output": { "location": { "uri": "string", "range": { "start": {}, "end": {} } } }
      }
    ]
  };
  send(makeResponse(id, result));  
}

function handleInitialize(id, params) {
  const result = {
    capabilities: {
      tools: {listChanged: false}
    },
    serverInfo: { name: 'mcpBridge', version: '0.1.0' },
    instructions: "This is a bridge to an LSP server for Ruby",
  };
  send(makeResponse(id, result));
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
}

function handlePing(id) {
  send(makeResponse(id, { status: 'ok', version: '0.1.0', uptimeMs: Date.now() - startTime }));
}

function handleShutdown(id) {
  send(makeResponse(id, { shutdown: true }));
}

function handleExit() {
  process.exit(0);
}

function simulateDiagnostics(uri) {
  // Very naive: report no diagnostics unless file contains "TODO"
  const text = openDocs.get(uri) || '';
  const diagnostics = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('TODO')) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: lines[i].length } },
        severity: 2,
        source: 'mcpBridge',
        message: 'Found TODO token',
      });
    }
  }
  return diagnostics;
}

function handleDiagnostics(id, params) {
  const uris = (params && params.uris) || Array.from(openDocs.keys());
  const res = {};
  for (const u of uris) {
    res[u] = simulateDiagnostics(u);
  }
  send(makeResponse(id, res));
}

function handleHover(id, params) {
  const { uri, position } = params || {};
  const text = openDocs.get(uri) || '';
  if (!text) {
    send(makeError(id, -32602, 'Document not open', { uri }));
    return;
  }
  const lines = text.split('\n');
  const line = lines[position.line] || '';
  // Very naive: if word under cursor is "Foo" return type
  const word = (line.split(/\W+/)[0] || '').trim();
  const contents = word ? `Symbol: ${word}\n(Type: unknown)` : 'No symbol';
  send(makeResponse(id, { contents }));
}

// Basic Content-Length framed reader
let leftover = Buffer.alloc(0);
process.stdin.on('readable', () => {
let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    leftover = Buffer.concat([leftover, Buffer.from(chunk)]);

    // First, drain any complete Content-Length framed messages
    while (true) {
      const s = leftover.toString('utf8');
      const idx = s.indexOf('\r\n\r\n');
      if (idx === -1) break;
      const header = s.slice(0, idx);
      const match = /Content-Length: (\d+)/i.exec(header);
      if (!match) {
        // invalid header: drop buffer to avoid infinite loop
        leftover = Buffer.alloc(0);
        break;
      }
      const len = parseInt(match[1], 10);
      const total = idx + 4 + len;
      if (leftover.length < total) break; // wait for more
      const body = leftover.slice(idx + 4, idx + 4 + len).toString('utf8');
      leftover = leftover.slice(total);
      try {
        const msg = JSON.parse(body);
        handleMessage(msg);
      } catch (e) {
        send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'error', message: `parse error (framed): ${e.message}` } });
      }
    }

    // If there is no framed header pending, also accept newline-delimited JSON lines.
    // Process complete lines and keep a partial line in leftover.
    const asString = leftover.toString('utf8');
    if (asString.includes('\n')) {
      const parts = asString.split('\n');
      const partial = parts.pop(); // last element may be incomplete
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          handleMessage(msg);
        } catch (e) {
          send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'error', message: `parse error (line): ${e.message}` } });
        }
      }
      leftover = Buffer.from(partial, 'utf8');
    }

    // otherwise keep leftover for next chunk
  }
});

function handleMessage(msg) {
  if (!msg) return;
  // verbose incoming message log
  try { sendLog('incoming', msg); } catch (e) {}
  if (msg.method) {
    // notification or request
    switch (msg.method) {
      case 'mcp/registerClient':
        // params: { id, host, port }
        registerClient(msg.id, msg.params);
        return;
      case 'mcp/unregisterClient':
        unregisterClient(msg.id, msg.params);
        return;
      case 'mcp/forwardToClient':
        // params: { clientId, method, params, isNotification }
        forwardToClient(msg.id, msg.params);
        return;
      case 'tools/call':
        switch(msg.params.name) {
          case 'get_definition':
            handleHover();
            break;
        }
        return;
      case 'tools/list':
        handleListTools(msg.id, msg.params); 
        return;
      case 'initialize':
        handleInitialize(msg.id, msg.params); 
        return;
      case 'ping':
        handlePing(msg.id, msg.params);
        return;
      case 'shutdown':
        handleShutdown(msg.id, msg.params);
        return;
      case 'exit':
        handleExit();
        return;
      case 'workspace/diagnostics':
        handleDiagnostics(msg.id, msg.params);
        return;
      case 'textDocument/hover':
        handleHover(msg.id, msg.params);
        return;
      default:
        // unknown method
        if (msg.id) send(makeError(msg.id, -32601, 'Method not found', { method: msg.method }));
        return;
    }
  } else if (msg.id) {
    // response from client? ignore
    try { sendLog('response-from-mcp', msg); } catch (e) {}
    return;
  }
}

// startup log
send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'info', message: 'mcpBridge started' } });

// keep alive
process.stdin.resume();

// --- Client registry and proxy helpers ---

function frameMessage(obj) {
  const s = JSON.stringify(obj);
  return Buffer.from(`Content-Length: ${Buffer.byteLength(s, 'utf8')}\r\n\r\n` + s, 'utf8');
}

function registerClient(requestId, params) {
  const { id, host, port } = params || {};
  if (!id || !host || !port) {
    if (requestId) send(makeError(requestId, -32602, 'Invalid params for registerClient', params));
    return;
  }
  if (clients.has(id)) {
    if (requestId) send(makeError(requestId, -32600, 'Client id already registered', { id }));
    return;
  }

  if (singleClientMode && clients.size > 0) {
    if (requestId) send(makeError(requestId, -32600, 'single-client mode: already have a client', { existing: Array.from(clients.keys()) }));
    return;
  }

  const socket = new net.Socket();
  const client = { socket, leftover: Buffer.alloc(0), nextId: 1, pending: new Map(), meta: null };
  clients.set(id, client);

  socket.connect(port, host, () => {
    client.meta = { id, host, port };
    send(makeResponse(requestId, { registered: true, id }));
    send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'info', message: `registered client ${id}@${host}:${port}` } });
    try { sendLog('client-connected', { id, host, port }); } catch (e) {}

        // announce tools immediately (harmless), editor will re-announce on initialized
    const tools = [
      {
        id: `${id}:sorbet`,
        name: 'Sorbet LSP',
        clientId: id,
        host,
        port,
        capabilities: [
          'textDocument/hover',
          'textDocument/publishDiagnostics',
          'textDocument/didOpen',
          'textDocument/didChange',
          'textDocument/didClose',
          'workspace/diagnostics'
        ]
      }
    ];
    send({ jsonrpc: '2.0', method: 'mcp/tools', params: { tools } });
  });

  socket.on('data', (chunk) => {
    client.leftover = Buffer.concat([client.leftover, Buffer.from(chunk)]);
    while (true) {
      const s = client.leftover.toString('utf8');
      const idx = s.indexOf('\r\n\r\n');
      if (idx === -1) break;
      const header = s.slice(0, idx);
      const match = /Content-Length: (\d+)/i.exec(header);
      if (!match) {
        client.leftover = Buffer.alloc(0);
        break;
      }
      const len = parseInt(match[1], 10);
      const total = idx + 4 + len;
      if (client.leftover.length < total) break;
      const body = client.leftover.slice(idx + 4, idx + 4 + len).toString('utf8');
      client.leftover = client.leftover.slice(total);
      try {
        const msg = JSON.parse(body);
        try { sendLog('client->bridge', { clientId: id, msg }); } catch (e) {}
        handleClientMessage(id, msg);
      } catch (e) {
        send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'error', message: 'client parse error' } });
      }
    }
  });

  socket.on('close', () => {
    clients.delete(id);
    send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'info', message: `client ${id} disconnected` } });
    try { sendLog('client-disconnected', { id }); } catch (e) {}
    if (singleClientMode) {
      // exit when the single client disconnects
      send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'info', message: 'single-client disconnected, exiting' } });
      process.exit(0);
    }
  });

  socket.on('error', (err) => {
    send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'error', message: `client ${id} error: ${err.message}` } });
    try { sendLog('client-error', { id, message: err.message }); } catch (e) {}
    if (requestId) send(makeError(requestId, -32000, 'client connect error', { message: err.message }));
  });
}

function unregisterClient(requestId, params) {
  const { id } = params || {};
  const c = clients.get(id);
  if (!c) {
    if (requestId) send(makeError(requestId, -32602, 'Unknown client id', { id }));
    return;
  }
  try { c.socket.end(); } catch (e) {}
  clients.delete(id);
  if (requestId) send(makeResponse(requestId, { unregistered: true, id }));
}

function forwardToClient(requestId, params) {
  const { clientId, method, params: p, isNotification } = params || {};
  const c = clients.get(clientId);
  if (!c) {
    if (requestId) send(makeError(requestId, -32602, 'Unknown client id', { clientId }));
    return;
  }

  try { sendLog('forward-to-client', { requestId, clientId, method, params: p, isNotification }); } catch (e) {}

  if (isNotification) {
    const notif = { jsonrpc: '2.0', method, params: p };
    c.socket.write(frameMessage(notif));
    if (requestId) send(makeResponse(requestId, { forwarded: true }));
    return;
  }

  // request -> we create a client-scoped id and map it back to original
  const clientReqId = `${clientId}:${c.nextId++}`;
  c.pending.set(clientReqId, { originId: requestId });
  try { sendLog('client-request-created', { clientId, clientReqId, originId: requestId }); } catch (e) {}
  const req = { jsonrpc: '2.0', id: clientReqId, method, params: p };
  c.socket.write(frameMessage(req));
}

function handleClientMessage(clientId, msg) {
  const c = clients.get(clientId);
  if (!c) return;
  if (msg.id && (msg.result !== undefined || msg.error !== undefined)) {
    // response -> find mapping
    const mapEntry = c.pending.get(String(msg.id));
    if (mapEntry) {
      const originId = mapEntry.originId;
      c.pending.delete(String(msg.id));
      try { sendLog('client-response-mapped', { clientId, clientMsgId: msg.id, originId }); } catch (e) {}
      if (msg.error) send(makeError(originId, msg.error.code || -32000, msg.error.message || 'error', msg.error.data));
      else send(makeResponse(originId, msg.result));
      return;
    }
  }
  // Otherwise forward as notification to MCP listeners
  // Keep the message intact, but avoid sending binary buffers
  try { sendLog('forwarding-client-notification', { clientId, msg }); } catch (e) {}
  send(msg);
}

// auto-register at startup
try {
  const registrations = parseStartupRegistrations();
  for (const registration of registrations) {
    registerClient(undefined, registration);
  }
} catch (e) {
  send({ jsonrpc: '2.0', method: 'mcp/log', params: { level: 'error', message: `startup register error: ${e}` } });
}
