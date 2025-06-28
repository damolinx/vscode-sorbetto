import { AbstractMessageSignature } from 'vscode-jsonrpc/lib/common/messages';
import { SorbetClient } from './lsp/languageClient';
import { Metrics } from './metrics';

/**
 * Shims the language client object so that all requests sent get timed.
 * @returns The instrumented language client.
 */
export function instrumentLanguageClient(client: SorbetClient, metrics: Metrics)
  : SorbetClient {
  const originalSendRequest = client.sendRequest;
  client.sendRequest = async (methodOrType: string | AbstractMessageSignature, ...args: any[]) => {
    const metric = `latency.${getRequestName(methodOrType)}_ms`;
    args.unshift(methodOrType);

    let response: any;
    let success = false;
    const now = Date.now();
    try {
      response = await originalSendRequest.apply(client, args as any);
      success = true;
    } finally {
      metrics.timing(metric, now, { success: success.toString() });
    }

    return response;
  };

  return client;

  function getRequestName(methodOrType: string | AbstractMessageSignature): string {
    const requestName = typeof methodOrType === 'string'
      ? methodOrType : methodOrType.method;
    return requestName.replace(/[/$]/g, '_');
  }
}
