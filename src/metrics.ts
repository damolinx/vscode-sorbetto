import { LogLevel } from 'vscode';
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
    this.log.trace('Increment', metric, count, tags);
  }

  gauge(metric: string, value: number, tags?: Tags): void {
    this.log.trace('Gauge', metric, value, tags);
  }

  timing(metric: string, value: number | Date, tags?: Tags): void {
    if (this.log.logLevel == LogLevel.Trace) {
      const time = Date.now() - (typeof value === 'number' ? value : value.getTime());
      this.log.trace('Timing', metric, time, tags);
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