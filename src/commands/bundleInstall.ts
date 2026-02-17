import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { executeCommandsInTerminal } from './utils';
import { verifyEnvironment } from './verifyEnvironment';

export async function bundleInstall(
  context: ExtensionContext,
  gemfile: vscode.Uri,
  action: 'install' | 'update',
) {
  if (!(await verifyEnvironment(context, ['bundle']))) {
    context.log.info('Skipping `bundle install` due to missing dependencies.');
    return;
  }

  return executeCommandsInTerminal({
    commands: ["bundle config set --local path 'vendor/bundle'", `bundle ${action}`],
    cwd: vscode.Uri.joinPath(gemfile, '..'),
    name: 'bundler',
  });
}
