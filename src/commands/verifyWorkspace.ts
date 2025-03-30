import { Position, Uri, window, workspace, WorkspaceEdit } from 'vscode';

const GEMFILE_HEADER: readonly string[] = ['source \'https://rubygems.org\'', ''];

const GEMFILE_DEPS: Readonly<Record<string, string>> = {
  'sorbet': 'gem \'sorbet\', :group => :development',
  'sorbet-runtime': 'gem \'sorbet-runtime\'',
  'tapioca': 'gem \'tapioca\', require: false, :group => :development'
};

export async function verifyWorkspace(pathOrUri?: string | Uri) {
  const uri = pathOrUri
    ? (pathOrUri instanceof Uri ? pathOrUri : Uri.parse(pathOrUri))
    : await getTargetWorkspaceUri();
  if (!uri) {
    return; // No target workspace
  }

  const edit = new WorkspaceEdit();
  const changes = await Promise.all([
    verifyGemfile(uri, edit),
    verifySorbetConfig(uri, edit)
  ]);

  if (changes.some((changed) => changed)) {
    // When files are only being created (not edited), `applyEdit` returns `false`
    // even on success so return value is useless to detect failures.
    await workspace.applyEdit(edit);
    await window.showInformationMessage('Workspace verification completed. Updates were made to the workspace.');
  } else {
    await window.showInformationMessage('Workspace verification completed. No changes were necessary.');
  }
}

async function verifyGemfile(workspaceUri: Uri, edit: WorkspaceEdit): Promise<boolean> {
  let changed = false;
  const gemFile = Uri.joinPath(workspaceUri, 'Gemfile');

  if (!await workspace.fs.stat(gemFile).then(() => true, () => false)) {
    const contents = GEMFILE_HEADER.concat(Object.values(GEMFILE_DEPS)).join('\n');
    edit.createFile(gemFile, { contents: Buffer.from(contents) });
    changed = true;
  } else {
    const requiredGems = await getRequiredGems(gemFile);
    if (requiredGems.length) {
      edit.insert(gemFile, new Position(Number.MAX_VALUE, 0), `\n${requiredGems.join('\n')}`);
      changed = true;
    }
  }

  return changed;

  async function getRequiredGems(gemfile: Uri): Promise<string[]> {
    const contents = await workspace.fs.readFile(gemfile).then(buffer => buffer.toString());
    const requiredStmts: string[] = [];
    for (const [name, stmt] of Object.entries(GEMFILE_DEPS)) {
      if (!new RegExp(`gem\\s+(['"])${name}\\1`).test(contents)) {
        requiredStmts.push(stmt);
      }
    }
    return requiredStmts;
  }
}

async function verifySorbetConfig(workspaceUri: Uri, edit: WorkspaceEdit): Promise<boolean> {
  let changed = false;
  const configFile = Uri.joinPath(workspaceUri, 'sorbet', 'config');

  if (!await workspace.fs.stat(configFile).then(() => true, () => false)) {
    edit.createFile(configFile, { contents: Buffer.from('--dir=.') });
    changed = true;
  }
  return changed;
}

async function getTargetWorkspaceUri(): Promise<Uri | undefined> {
  const workspaceFolders = workspace.workspaceFolders;
  switch (workspaceFolders?.length) {
    case 0:
    case undefined:
      return;
    case 1:
      return workspaceFolders[0].uri;
    default:
      return window.showWorkspaceFolderPick({
        placeHolder: 'Select a workspace folder',
      }).then((value) => value?.uri);
  }
}
