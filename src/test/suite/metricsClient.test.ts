import * as path from 'path';
import * as sinon from 'sinon';
import { NoopMetrics } from '../../metrics';

suite(`Test Suite: ${path.basename(__filename, '.test.js')}`, () => {
  let testRestorables: { restore: () => void }[];

  setup(() => {
    testRestorables = [];
  });

  teardown(() => {
    testRestorables.forEach((r) => r.restore());
  });

  test('increment called correctly', async () => {
    const expectedMetricName = 'metricClient.test.increment';
    const expectedCount = 123;
    const expectedTags = { foo: 'bar' };

    const client = new NoopMetrics();
    const incrementStub = sinon.stub(client, 'increment');
    testRestorables.push(incrementStub);

    await client.increment(
      expectedMetricName,
      expectedCount,
      expectedTags,
    );

    sinon.assert.calledOnce(incrementStub);
    sinon.assert.calledWithMatch(
      incrementStub.firstCall,
      expectedMetricName,
      expectedCount,
      expectedTags,
    );
  });

  test('timing called correctly', async () => {
    const expectedMetricName = 'metricClient.test.timing';
    const expectedCount = 123;
    const expectedTags = { foo: 'bar' };

    const client = new NoopMetrics();
    const timingStub = sinon.stub(client, 'timing');
    testRestorables.push(timingStub);

    await client.timing(
      expectedMetricName,
      expectedCount,
      expectedTags,
    );

    sinon.assert.calledOnce(timingStub);
    sinon.assert.calledWithMatch(
      timingStub,
      expectedMetricName,
      expectedCount,
      expectedTags,
    );
  });
});
