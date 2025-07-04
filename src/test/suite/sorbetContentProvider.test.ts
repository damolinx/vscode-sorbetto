// import * as vscode from 'vscode';
// import * as assert from 'assert';
// import * as path from 'path';
// import * as sinon from 'sinon';

// import { SorbetContentProvider } from '../../providers/sorbetContentProvider';
// import { SorbetLanguageClient } from '../../sorbetLanguageClient';
// import { SorbetExtensionContext } from '../../sorbetExtensionContext';
// import { SorbetClientManager } from '../../sorbetClientManager';
// import { SorbetStatusProvider } from '../../sorbetStatusProvider';
// import { createLogStub } from './testUtils';

// suite(`Test Suite: ${path.basename(__filename, '.test.js')}`, () => {
//   let testRestorables: { restore: () => void }[];

//   setup(() => {
//     testRestorables = [];
//   });

//   teardown(() => {
//     testRestorables.forEach((r) => r.restore());
//   });

//   test('provideTextDocumentContent succeeds', async () => {
//     const fileUri = vscode.Uri.parse('sorbet:/test/file', true);
//     const expectedContents = '';

//     const sendRequestSpy = sinon.spy(async (_params) => ({
//       text: expectedContents,
//     }));
//     const context = {
//       log: createLogStub(),
//       clientManager: {
//         sorbetClient: ({
//           sendReadFileRequest: sendRequestSpy,
//         } as unknown) as SorbetLanguageClient,
//       } as SorbetClientManager,
//     } as SorbetExtensionContext;

//     const provider = new SorbetContentProvider(context);
//     assert.strictEqual(
//       await provider.provideTextDocumentContent(fileUri),
//       expectedContents,
//     );

//     sinon.assert.calledOnceWithMatch(sendRequestSpy, {
//       uri: fileUri.toString(),
//     });
//   });

//   test('provideTextDocumentContent handles no activeLanguageClient', async () => {
//     const fileUri = vscode.Uri.parse('sorbet:/test/file', true);
//     const statusProvider = {} as SorbetStatusProvider;
//     const context = {
//       log: createLogStub(),
//       statusProvider,
//     } as SorbetExtensionContext;
//     const provider = new SorbetContentProvider(context);
//     assert.strictEqual(await provider.provideTextDocumentContent(fileUri), '');
//   });
// });
