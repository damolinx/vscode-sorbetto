import * as vscode from 'vscode';
import { basename } from 'path';
import { PACKAGE_FILENAME } from '../constants';
import { ExtensionContext } from '../extensionContext';

/**
 * Save all modified __package.rb files.
 * @param context Extension context.
 */
export async function savePackageFiles(context: ExtensionContext): Promise<void> {
  const documents = vscode.workspace.textDocuments.filter(
    (document) => document.isDirty && basename(document.fileName) === PACKAGE_FILENAME,
  );

  if (documents.length === 0) {
    context.log.trace('SavePackageFiles: nothing to save');
    return;
  }

  context.log.trace('SavePackageFiles: Saving package files', documents.length);
  for (const document of documents) {
    await document.save();
  }
}
