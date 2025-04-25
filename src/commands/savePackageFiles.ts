import { workspace } from 'vscode';
import { basename } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export const PACKAGE_FILENAME = '__package.rb';

/**
 * Save all __package.rb files with changes.
 *
 * @param context Sorbet extension context.
 * @return `true` if all the files were successfully saved.
 */
export async function savePackageFiles(
  context: SorbetExtensionContext,
): Promise<boolean> {
  const pkgDocs = workspace.textDocuments.filter((document) =>
    document.isDirty && basename(document.fileName) === PACKAGE_FILENAME,
  );

  switch (pkgDocs.length) {
    case 0:
      context.log.trace('SavePackageFiles: nothing to save');
      return true;
    case 1:
      context.log.trace('SavePackageFiles: saving package file');
      return await pkgDocs[0].save();
    default:
      context.log.trace('SavePackageFiles: Saving package files', pkgDocs.length);
      return (await Promise.all(pkgDocs.map((document) => document.save()))).every((saved) => saved);
  }
}
