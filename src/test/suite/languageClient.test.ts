import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import * as assert from 'assert';
import { TestLanguageServerSpecialURIs } from './testLanguageServerSpecialURIs';
import { instrumentLanguageClient } from '../../languageClient.metrics';
import { MetricsClient, Tags } from '../../metricsClient';

const enum MetricType {
  Increment,
  Gauge,
  Timing,
}

class RecordingMetricsClient implements MetricsClient {
  private metrics: [MetricType, string, number, Tags][] = [];

  getAndResetMetrics(): [MetricType, string, number, Tags][] {
    const rv = this.metrics;
    this.metrics = [];
    return rv;
  }

  async increment(
    metricName: string,
    count = 1,
    tags: Readonly<Record<string, string>> = {},
  ): Promise<void> {
    this.metrics.push([MetricType.Increment, metricName, count, tags]);
  }

  async gauge(
    metricName: string,
    value: number,
    tags: Readonly<Record<string, string>> = {},
  ): Promise<void> {
    this.metrics.push([MetricType.Gauge, metricName, value, tags]);
  }

  async timing(
    metricName: string,
    value: number | Date,
    tags: Tags = {},
  ): Promise<void> {
    const rawValue =
      typeof value === 'number' ? value : Date.now() - value.valueOf();
    this.metrics.push([MetricType.Timing, metricName, rawValue, tags]);
  }

  async flush(): Promise<void> {
    // No-op
  }
}

// Uninitialized client. Call start and await on it before use.
function createLanguageClient(): LanguageClient {
  // The server is implemented in node
  const serverModule = require.resolve('./testLanguageServer');
  // The debug options for the server
  const debugOptions = { execArgv: [] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {},
  };

  // Create the language client and start the client.
  const client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions,
  );

  return client;
}

suite('LanguageClient', () => {
  suite('Metrics', () => {
    let metricsEmitter: RecordingMetricsClient;

    suiteSetup(() => {
      metricsEmitter = new RecordingMetricsClient();
    });

    test('Shims language clients and records latency metrics', async () => {
      const client = instrumentLanguageClient(
        createLanguageClient(),
        metricsEmitter,
      );
      await client.start();

      {
        const successResponse = await client.sendRequest('textDocument/hover', {
          textDocument: {
            uri: TestLanguageServerSpecialURIs.SUCCESS,
          },
          position: { line: 1, character: 1 },
        });
        assert.strictEqual(
          (successResponse as any).contents,
          TestLanguageServerSpecialURIs.SUCCESS,
        );
        assertTimingMetric(metricsEmitter, 'true');
      }

      {
        const successResponse = await client.sendRequest('textDocument/hover', {
          textDocument: {
            uri: TestLanguageServerSpecialURIs.SUCCESS,
          },
          position: { line: 1, character: 1 },
        });
        assert.strictEqual(
          (successResponse as any).contents,
          TestLanguageServerSpecialURIs.SUCCESS,
        );
        assertTimingMetric(metricsEmitter, 'true');
      }

      try {
        await client.sendRequest('textDocument/hover', {
          textDocument: {
            uri: TestLanguageServerSpecialURIs.FAILURE,
          },
          position: { line: 1, character: 1 },
        });
        assert.fail('Request should have failed.');
      } catch (e) {
        assert(
          ((e as any).message as string).indexOf(
            TestLanguageServerSpecialURIs.FAILURE,
          ) !== -1,
        );
        assertTimingMetric(metricsEmitter, 'false');
      }

      try {
        await client.sendRequest('textDocument/hover', {
          textDocument: {
            uri: TestLanguageServerSpecialURIs.EXIT,
          },
          position: { line: 1, character: 1 },
        });
        assert.fail('Request should have failed.');
      } catch {
        assertTimingMetric(metricsEmitter, 'false');
      }
    });
  });

  function assertTimingMetric(client: RecordingMetricsClient, success: 'true' | 'false') {
    const metrics = client.getAndResetMetrics();
    assert.strictEqual(metrics.length, 1);
    assert.strictEqual(typeof metrics[0][2], 'number');
    assert.deepStrictEqual(metrics[0], [
      MetricType.Timing,
      'latency.textDocument_hover_ms',
      metrics[0][2], // Time value is variable.
      { success },
    ]);
  }
});
