import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as sinon from 'sinon';

import { Action, showSorbetActions } from '../../../commands/showSorbetActions';

suite(`Test Suite: ${path.basename(__filename, '.test.js')}`, () => {
  let testRestorables: { restore: () => void }[];

  setup(() => {
    testRestorables = [];
  });

  teardown(() => {
    testRestorables.forEach((r) => r.restore());
  });

  test('showSorbetActions: Shows dropdown (no-selection)', async () => {
    const showQuickPickSingleStub = sinon
      .stub(vscode.window, 'showQuickPick')
      .resolves(undefined); // User canceled
    testRestorables.push(showQuickPickSingleStub);

    await assert.doesNotReject(showSorbetActions());

    sinon.assert.calledOnce(showQuickPickSingleStub);
    assert.deepStrictEqual(showQuickPickSingleStub.firstCall.args[0], [
      Action.ConfigureSorbet,
      Action.RestartSorbet,
      Action.ViewOutput,
    ]);
    assert.deepStrictEqual(showQuickPickSingleStub.firstCall.args[1], {
      placeHolder: 'Select an action',
    });
  });
});
