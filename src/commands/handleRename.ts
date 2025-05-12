import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';
import { dirname, extname, relative, sep } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

const REQUIRE_RELATIVE_REGEX = /(?<before>require_relative\s+(['"]))(?<path>.+)\2/g;

interface FileRename { readonly oldUri: Uri; readonly newUri: Uri }
interface RequireMatch { readonly range: Range; readonly path: string; }

export async function handleRename(_context: SorbetExtensionContext, renames: readonly FileRename[]) {
  const renameMap = new Map(
    renames
      .filter((entry) => extname(entry.newUri.fsPath) === '.rb')
      .map((entry) => [entry.oldUri.fsPath, entry]),
  );
  if (renameMap.size === 0) {
    return; // No interesting files
  }

  const workspaceEdit = new WorkspaceEdit();
  const docsToSave: TextDocument[] = [];

  for (const { oldUri, newUri } of renameMap.values()) {
    const document = await workspace.openTextDocument(newUri);
    const matches = findRequires(document);
    if (matches.length === 0) {
      continue; // No `require_relative`
    }

    const updated = await updateRequires(workspaceEdit, oldUri, newUri, matches, renameMap);
    if (updated && !document.isDirty) {
      docsToSave.push(document);
    }
  }

  const succeeded = await workspace.applyEdit(workspaceEdit);
  if (succeeded) {
    for (const doc of docsToSave) {
      await doc.save();
    }
  }
}

function findRequires(document: TextDocument): RequireMatch[] {
  const matches: RequireMatch[] = [];
  const text = document.getText();

  let match;
  while ((match = REQUIRE_RELATIVE_REGEX.exec(text))) {
    const path = match.groups!.path;
    const start = document.positionAt(match.index + match.groups!.before.length);
    matches.push({ path: path, range: new Range(start, start.translate(0, path.length)) });
  }

  return matches;
}

async function updateRequires(
  edit: WorkspaceEdit,
  oldUri: Uri, newUri: Uri,
  matches: RequireMatch[],
  renameMap: Map<string, FileRename>):
  Promise<boolean> {
  const oldDirUri = Uri.file(dirname(oldUri.fsPath));
  const newDirUri = Uri.file(dirname(newUri.fsPath));

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const requireUri = getCurrentRequireFullPath(oldDirUri, match);
    edit.replace(newUri, match.range, getNewRequireRelativePath(newDirUri, requireUri));
  }
  return matches.length > 0;

  function getCurrentRequireFullPath(base: Uri, match: RequireMatch) {
    let requireUri = Uri.joinPath(base, match.path);
    const updateRequirePathEntry = renameMap.get(requireUri.fsPath);
    if (updateRequirePathEntry) {
      requireUri = updateRequirePathEntry.newUri;
    }
    return requireUri;
  }

  function getNewRequireRelativePath(from: Uri, requireUri: Uri) {
    let newRequirePath = relative(from.fsPath, requireUri.fsPath);
    if (sep !== '/') {
      newRequirePath = newRequirePath.replaceAll(sep, '/');
    }
    return newRequirePath;
  }
}