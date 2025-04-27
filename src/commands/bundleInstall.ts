import { Uri } from 'vscode';
import { dirname } from 'path';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { executeCommandsInTerminal } from './utils';

export function bundleInstall(_context: SorbetExtensionContext, gemfile: string | Uri) {
  return executeCommandsInTerminal({
    commands: ['bundle config set --local path \'vendor/bundle\'', 'bundle install'],
    cwd: dirname(gemfile instanceof Uri ? gemfile.fsPath : gemfile),
    name: 'bundle install',
  });
}