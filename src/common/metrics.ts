import * as vscode from 'vscode';
import * as vslcn from 'vscode-languageclient/node';
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
}

/**
 * A {@link Metrics} implementation that logs all metrics to the {@link log given} {@link Log}.
 */
export class LogMetrics implements Metrics {
  constructor(private readonly log: Log) {
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
    if (this.log.logLevel == vscode.LogLevel.Trace) {
      const time = Date.now() - (typeof value === 'number' ? value : value.getTime());
      if (tags) {
        this.log.trace('Timing', metric, time, tags);
      } else {
        this.log.trace('Timing', metric, time);
      }
    }
  }
}

/**
 * Shims the language client object so that all requests sent get timed.
 * @returns The instrumented language client.
 */
export function instrumentLanguageClient<TClient extends vslcn.LanguageClient>(
  client: TClient,
  metrics: Metrics,
): TClient {
  const originalSendRequest = client.sendRequest;
  client.sendRequest = async (methodOrType: string | any, ...args: any[]) => {
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

  function getRequestName(methodOrType: string | any): string {
    const requestName = typeof methodOrType === 'string' ? methodOrType : methodOrType.method;
    return requestName.replace(/[/$]/g, '_');
  }
}
