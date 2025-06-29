import * as vscode from 'vscode';
import * as vsclc from 'vscode-languageclient/node';
import * as path from 'path';
import * as sinon from 'sinon';

import { createLogStub } from '../testUtils';
import { copySymbolToClipboard } from '../../../commands/copySymbolToClipboard';
import { SorbetClientManager } from '../../../sorbetClientManager';
import { SorbetExtensionContext } from '../../../sorbetExtensionContext';
import { SorbetLanguageClient } from '../../../sorbetLanguageClient';
import { ServerStatus } from '../../../types';

suite(`Test Suite: ${path.basename(__filename, '.test.js')}`, () => {
  let testRestorables: { restore: () => void }[];

  setup(() => {
    testRestorables = [];
  });

  teardown(() => {
    testRestorables.forEach((r) => r.restore());
  });

  test('copySymbolToClipboard: does nothing if client is not present', async () => {
    const expectedUri = vscode.Uri.parse('file://workspace/test.rb');
    const editor = createMockEditor(expectedUri);

    const writeTextSpy = sinon.spy();
    const envClipboardStub = sinon.stub(vscode, 'env').value(({
      clipboard: {
        writeText: writeTextSpy,
      } as any,
    } as any));
    testRestorables.push(envClipboardStub);

    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      clientManager: { sorbetClient: undefined } as SorbetClientManager,
    } as SorbetExtensionContext;
    await copySymbolToClipboard(context, editor);

    sinon.assert.notCalled(writeTextSpy);
  });

  test('copySymbolToClipboard: does nothing if client is not ready', async () => {
    const expectedUri = vscode.Uri.parse('file://workspace/test.rb');
    const editor = createMockEditor(expectedUri);

    const writeTextSpy = sinon.spy();
    const envClipboardStub = sinon.stub(vscode, 'env').value(({
      clipboard: {
        writeText: writeTextSpy,
      } as any,
    } as any));
    testRestorables.push(envClipboardStub);

    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      clientManager: {
        sorbetClient: {
          status: ServerStatus.DISABLED,
        },
      } as SorbetClientManager,
    } as SorbetExtensionContext;
    await copySymbolToClipboard(context, editor);

    sinon.assert.notCalled(writeTextSpy);
  });

  test('copySymbolToClipboard: does nothing if client does not support `sorbetShowSymbolProvider`', async () => {
    const expectedUri = vscode.Uri.parse('file://workspace/test.rb');
    const editor = createMockEditor(expectedUri);

    const writeTextSpy = sinon.spy();
    const envClipboardStub = sinon.stub(vscode, 'env').value(({
      clipboard: {
        writeText: writeTextSpy,
      } as any,
    } as any));
    testRestorables.push(envClipboardStub);
    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      clientManager: {
        sorbetClient: {
          capabilities: {
            sorbetShowSymbolProvider: false,
          },
          status: ServerStatus.RUNNING,
        } as SorbetLanguageClient,
      },
    } as SorbetExtensionContext;
    await copySymbolToClipboard(context, editor);

    sinon.assert.notCalled(writeTextSpy);
  });

  test('copySymbolToClipboard: copies symbol to clipboard when there is a valid selection', async () => {
    const expectedUri = vscode.Uri.parse('file://workspace/test.rb');
    const expectedSymbolName = 'test_symbol_name';
    const editor = createMockEditor(expectedUri);

    const writeTextSpy = sinon.spy();
    const envClipboardStub = sinon.stub(vscode, 'env').value(({
      clipboard: {
        writeText: writeTextSpy,
      } as any,
    } as any));
    testRestorables.push(envClipboardStub);

    const sendRequestSpy = sinon.spy(
      (_param: vsclc.TextDocumentPositionParams) =>
        Promise.resolve({
          name: expectedSymbolName,
        } as vsclc.SymbolInformation),
    );

    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      clientManager: {
        sorbetClient: {
          capabilities: {
            sorbetShowSymbolProvider: true,
          },
          sendShowSymbolRequest: sendRequestSpy as any,
          status: ServerStatus.RUNNING,
        } as SorbetLanguageClient,
      } as SorbetClientManager,
    } as SorbetExtensionContext;

    await copySymbolToClipboard(context, editor);

    sinon.assert.calledOnce(writeTextSpy);
    sinon.assert.calledWith(writeTextSpy, expectedSymbolName);
    sinon.assert.calledOnceWithMatch(sendRequestSpy, sinon.match.object);
  });
});

function createMockEditor(expectedUri: vscode.Uri): any {
  return {
    document: { uri: expectedUri },
    selection: new vscode.Selection(1, 1, 1, 1),
  } as vscode.TextEditor;
}
