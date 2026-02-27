import * as vscode from 'vscode';
import { GEMFILE_FILENAME } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal, getTargetWorkspaceFolder } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

const GEMFILE_HEADER = ["source 'https://rubygems.org'", ''] as const;

const GEMFILE_DEPS = {
  sorbet: "gem 'sorbet', group: :development",
  'sorbet-runtime': "gem 'sorbet-runtime'",
  tapioca: "gem 'tapioca', require: false, group: %i[development test]",
} as const;

export async function setupWorkspace(
  context: ExtensionContext,
  contextUri?: vscode.Uri,
): Promise<void> {
  const workspaceFolder = await getTargetWorkspaceFolder(context, contextUri, {
    skipSorbetWorkspaceVerification: true,
  });
  if (!workspaceFolder) {
    context.log.debug('SetupWorkspace: No workspace.');
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  const changes = await Promise.all([
    verifyGemfile(workspaceFolder, edit),
    verifySorbetConfig(workspaceFolder, edit),
  ]);

  if (changes.some((changed) => changed)) {
    // When files are only being created (not edited), `applyEdit` returns `false`
    // even on success so return value is useless to detect failures.
    await vscode.workspace.applyEdit(edit);
    for (const entry of edit.entries()) {
      const document = await vscode.workspace.openTextDocument(entry[0]);
      await document.save();
    }
    context.log.info('SetupWorkspace: Added Gemfile and Sorbet config.');
  } else {
    context.log.info('SetupWorkspace: No files were added.');
  }

  if (await verifyEnvironment(context)) {
    const terminal = await executeCommandsInTerminal({
      commands: [
        "bundle config set --local path 'vendor/bundle'",
        'bundle install',
        'bundle exec tapioca init',
      ],
      cwd: workspaceFolder.uri,
      name: 'setup',
    });
    if (terminal) {
      const disposable = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
        if (closedTerminal === terminal) {
          disposable.dispose();
          await context.clientManager.ensureClientHost(workspaceFolder);
        }
      });
    }
  } else {
    context.log.info('Skipping `bundle install` due to missing dependencies.');
  }
}

async function verifyGemfile(
  workspaceFolder: vscode.WorkspaceFolder,
  edit: vscode.WorkspaceEdit,
): Promise<boolean> {
  let changed = false;
  const gemFile = vscode.Uri.joinPath(workspaceFolder.uri, GEMFILE_FILENAME);

  if (
    !(await vscode.workspace.fs.stat(gemFile).then(
      () => true,
      () => false,
    ))
  ) {
    const contents = [
      '# frozen_string_literal: true',
      '',
      ...GEMFILE_HEADER,
      ...Object.values(GEMFILE_DEPS),
    ].join('\n');
    edit.createFile(gemFile, { contents: Buffer.from(contents) });
    changed = true;
  } else {
    const requiredStmts = await getRequiredStatements(gemFile);
    if (requiredStmts.length) {
      edit.insert(gemFile, new vscode.Position(Number.MAX_VALUE, 0), requiredStmts);
      changed = true;
    }
  }

  return changed;

  async function getRequiredStatements(gemfile: vscode.Uri): Promise<string> {
    const requiredStmts: string[] = [];

    const contents = await vscode.workspace.fs
      .readFile(gemfile)
      .then((buffer) => buffer.toString());

    if (!/source\s+['"']/.test(contents)) {
      requiredStmts.push(...GEMFILE_HEADER);
    } else {
      requiredStmts.push('');
    }

    for (const [name, stmt] of Object.entries(GEMFILE_DEPS)) {
      if (!new RegExp(`gem\\s+(['"])${name}\\1`).test(contents)) {
        requiredStmts.push(stmt);
      }
    }

    return requiredStmts.join('\n');
  }
}

async function verifySorbetConfig(
  workspaceFolder: vscode.WorkspaceFolder,
  edit: vscode.WorkspaceEdit,
): Promise<boolean> {
  let changed = false;
  const configFile = vscode.Uri.joinPath(workspaceFolder.uri, 'sorbet', 'config');

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
