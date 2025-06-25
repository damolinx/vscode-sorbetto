import * as vscode from 'vscode';
import * as vsclc from 'vscode-languageclient/node';
import * as path from 'path';
import * as sinon from 'sinon';

import { createLogStub } from '../testUtils';
import { copySymbolToClipboard } from '../../../commands/copySymbolToClipboard';
import { ShowOperationParams } from '../../../lsp/showOperationNotification';
import { SorbetLanguageClient } from '../../../sorbetLanguageClient';
import { SorbetExtensionContext } from '../../../sorbetExtensionContext';
import { SorbetStatusProvider } from '../../../sorbetStatusProvider';
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

    const statusProvider = {
      activeLanguageClient: undefined,
    } as SorbetStatusProvider;
    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      statusProvider,
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

    const statusProvider = {
      activeLanguageClient: {
        status: ServerStatus.DISABLED,
      } as SorbetLanguageClient,
    } as SorbetStatusProvider;
    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      statusProvider,
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

    const statusProvider = {
      activeLanguageClient: {
        capabilities: {
          sorbetShowSymbolProvider: false,
        },
        status: ServerStatus.RUNNING,
      } as SorbetLanguageClient,
    } as SorbetStatusProvider;

    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      statusProvider,
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
      (_method: string, _param: vsclc.TextDocumentPositionParams) =>
        Promise.resolve({
          name: expectedSymbolName,
        } as vsclc.SymbolInformation),
    );

    const statusProvider = {
      activeLanguageClient: {
        capabilities: {
          sorbetShowSymbolProvider: true,
        },
        sendRequest: sendRequestSpy as any,
        status: ServerStatus.RUNNING,
      } as SorbetLanguageClient,
      operations: [] as readonly Readonly<ShowOperationParams>[],
    } as SorbetStatusProvider;
    const context = {
      log: createLogStub(vscode.LogLevel.Info),
      statusProvider,
    } as SorbetExtensionContext;

    await copySymbolToClipboard(context, editor);

    sinon.assert.calledOnce(writeTextSpy);
    sinon.assert.calledWith(writeTextSpy, expectedSymbolName);
    sinon.assert.calledOnce(sendRequestSpy);
    sinon.assert.calledWith(
      sendRequestSpy,
      'sorbet/showSymbol',
      sinon.match.object,
    );
  });
});

function createMockEditor(expectedUri: vscode.Uri): any {
  return {
    document: { uri: expectedUri },
    selection: new vscode.Selection(1, 1, 1, 1),
  } as vscode.TextEditor;
}
