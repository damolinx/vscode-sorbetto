import * as vscode from 'vscode';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal, getTargetWorkspaceUri } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

const GEMFILE_HEADER: readonly string[] = ["source 'https://rubygems.org'", ''];

const GEMFILE_DEPS: Readonly<Record<string, string>> = {
  sorbet: "gem 'sorbet', :group => :development",
  'sorbet-runtime': "gem 'sorbet-runtime'",
  tapioca: "gem 'tapioca', require: false, :group => [:development, :test]",
};

export async function setupWorkspace(
  context: SorbetExtensionContext,
  pathOrUri?: string | vscode.Uri,
) {
  const uri = pathOrUri
    ? pathOrUri instanceof vscode.Uri
      ? pathOrUri
      : vscode.Uri.parse(pathOrUri)
    : await getTargetWorkspaceUri();
  if (!uri) {
    return; // No target workspace
  }

  const edit = new vscode.WorkspaceEdit();
  const changes = await Promise.all([verifyGemfile(uri, edit), verifySorbetConfig(uri, edit)]);

  if (changes.some((changed) => changed)) {
    // When files are only being created (not edited), `applyEdit` returns `false`
    // even on success so return value is useless to detect failures.
    await vscode.workspace.applyEdit(edit);
    context.log.info('Workspace verification: Added Gemfile and Sorbet config.');
  } else {
    context.log.info('Workspace verification: No files were added.');
  }

  if (await verifyEnvironment(context)) {
    const terminal = await executeCommandsInTerminal({
      commands: [
        "bundle config set --local path 'vendor/bundle'",
        'bundle install',
        'bundle exec tapioca init',
      ],
      cwd: uri.fsPath,
      name: 'bundle install',
    });
    if (terminal) {
      const disposable = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
        if (closedTerminal === terminal) {
          disposable.dispose();
          await context.clientManager.getClient(uri)?.start();
        }
      });
    }
  } else {
    context.log.info('Skipping `bundle install` due to missing dependencies.');
  }
}

async function verifyGemfile(
  workspaceUri: vscode.Uri,
  edit: vscode.WorkspaceEdit,
): Promise<boolean> {
  let changed = false;
  const gemFile = vscode.Uri.joinPath(workspaceUri, 'Gemfile');

  if (
    !(await vscode.workspace.fs.stat(gemFile).then(
      () => true,
      () => false,
    ))
  ) {
    const contents = GEMFILE_HEADER.concat(Object.values(GEMFILE_DEPS)).join('\n');
    edit.createFile(gemFile, { contents: Buffer.from(contents) });
    changed = true;
  } else {
    const requiredGems = await getRequiredGems(gemFile);
    if (requiredGems.length) {
      edit.insert(
        gemFile,
        new vscode.Position(Number.MAX_VALUE, 0),
        `\n${requiredGems.join('\n')}`,
      );
      changed = true;
    }
  }

  return changed;

  async function getRequiredGems(gemfile: vscode.Uri): Promise<string[]> {
    const contents = await vscode.workspace.fs
      .readFile(gemfile)
      .then((buffer) => buffer.toString());
    const requiredStmts: string[] = [];
    for (const [name, stmt] of Object.entries(GEMFILE_DEPS)) {
      if (!new RegExp(`gem\\s+(['"])${name}\\1`).test(contents)) {
        requiredStmts.push(stmt);
      }
    }
    return requiredStmts;
  }
}

async function verifySorbetConfig(
  workspaceUri: vscode.Uri,
  edit: vscode.WorkspaceEdit,
): Promise<boolean> {
  let changed = false;
  const configFile = vscode.Uri.joinPath(workspaceUri, 'sorbet', 'config');

  if (
    !(await vscode.workspace.fs.stat(configFile).then(
      () => true,
      () => false,
    ))
  ) {
    edit.createFile(configFile, { contents: Buffer.from('--dir=.\n--ignore=vendor/') });
    changed = true;
  }
  return changed;
}
