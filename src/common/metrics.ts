import { LogLevel } from 'vscode';
import { AbstractMessageSignature } from 'vscode-jsonrpc/lib/common/messages';
import { SorbetLanguageClient } from '../lsp/languageClient';
import { Log } from './log';

export type Tags = Record<string, string>;

export interface Metrics {
  /**
   * Increments the given counter metric by the given count.
   */
  increment(metric: string, count: number, tags?: Tags): Promise<void> | void;

  /**
   * Sets the given gauge metric to the given value.
   */
  gauge(metric: string, value: number, tags?: Tags): Promise<void> | void;

  /**
   * Records a runtime for the specific metric.
   */
  timing(metric: string, value: number | Date, tags?: Tags): Promise<void> | void;

  /**
   * Emits any unsent metrics.
   */
  flush(): Promise<void> | void;
}

export class LogMetrics implements Metrics {
  private readonly log: Log;

  constructor(log: Log) {
    this.log = log;
  }

  increment(metric: string, count: number, tags?: Tags): void {
    if (tags) {
      this.log.trace('Increment', metric, count, tags);
    } else {
      this.log.trace('Increment', metric, count);
    }
  }

  gauge(metric: string, value: number, tags?: Tags): void {
    if (tags) {
      this.log.trace('Gauge', metric, value, tags);
    } else {
      this.log.trace('Gauge', metric, value);
    }
  }

  timing(metric: string, value: number | Date, tags?: Tags): void {
    if (this.log.logLevel == LogLevel.Trace) {
      const time = Date.now() - (typeof value === 'number' ? value : value.getTime());
      if (tags) {
        this.log.trace('Timing', metric, time, tags);
      } else {

        this.log.trace('Timing', metric, time);
      }
    }
  }

  flush(): void { }
}

export class NoopMetrics implements Metrics {
  increment(_metric: string, _count?: number, _tags?: Tags): void { }

  gauge(_metric: string, _value: number, _tags?: Tags): void { }

  timing(_metric: string, _value: number | Date, _tags?: Tags): void { }

  flush(): void { }
}

/**
 * Shims the language client object so that all requests sent get timed.
 * @returns The instrumented language client.
 */
export function instrumentLanguageClient(client: SorbetLanguageClient, metrics: Metrics)
  : SorbetLanguageClient {
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