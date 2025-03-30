export type Tags = Readonly<Record<string, string>>;

export interface MetricsClient {
  /**
   * Increments the given counter metric by the given count (default: 1 if unspecified).
   */
  increment(metricName: string, count?: number, tags?: Tags): Promise<void>;

  /**
   * Sets the given gauge metric to the given value.
   */
  gauge(metricName: string, value: number, tags?: Tags): Promise<void>;

  /**
   * Records a runtime for the specific metric. Is not present on older versions of metrics extension.
   */
  timing(metricName: string, value: number | Date, tags?: Tags): Promise<void>;

  /** Emits any unsent metrics. */
  flush(): Promise<void>;
}

export class NoOpMetricsClient implements MetricsClient {
  async increment(
    _metricName: string,
    _count?: number,
    _tags?: Tags,
  ): Promise<void> {}

  async gauge(
    _metricName: string,
    _value: number,
    _tags?: Tags,
  ): Promise<void> {}

  async timing(
    _metricName: string,
    _value: number | Date,
    _tags?: Tags,
  ): Promise<void> {}

  async flush(): Promise<void> {}
}