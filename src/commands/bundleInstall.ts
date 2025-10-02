import * as vscode from 'vscode';
import { dirname } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function bundleInstall(context: SorbetExtensionContext, gemfile: string | vscode.Uri) {
  if (!(await verifyEnvironment(context, 'bundle'))) {
    context.log.info('Skipping `bundle install` due to missing dependencies.');
    return;
  }

  return executeCommandsInTerminal({
    commands: ["bundle config set --local path 'vendor/bundle'", 'bundle install'],
    cwd: dirname(gemfile instanceof vscode.Uri ? gemfile.fsPath : gemfile),
    name: 'bundle install',
  });
}
