import { commands, env, Uri, window } from 'vscode';
import { exec } from 'child_process';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function verifyEnvironment(context: SorbetExtensionContext) {
  const commandsToCheck = ['srb', 'bundle'];
  if (!context.configuration.lspConfig?.command.includes('--disable-watchman')) {
    commandsToCheck.unshift('watchman');
  }

  const missingCommands: string[] = [];
  const whereOrWhichCommand = process.platform === 'win32' ? 'where' : 'which';

  for (const command of commandsToCheck) {
    const exists = await check(whereOrWhichCommand, command);
    if (exists) {
      break;
    } else {
      missingCommands.push(command);
    }
  }

  if (missingCommands.length) {
    let result = false;
    const START_OPTION = 'Start Sorbet';
    const CONFIGURE_OPTION = 'Configure';
    const DISABLE_OPTION = 'Disable Verification';
    const DOC_OPTION = 'Documentation';
    const option = await window.showErrorMessage(
      `Following dependencies are missing: ${missingCommands.join(', ')}. Sorbet will not be started automatically.`,
      START_OPTION,
      CONFIGURE_OPTION,
      DISABLE_OPTION,
      DOC_OPTION,
    );

    // Don't await
    switch (option) {
      case START_OPTION:
        result = true;
        break;
      case CONFIGURE_OPTION:
        commands.executeCommand('workbench.action.openSettings', 'sorbetto.sorbetLsp');
        break;
      case DISABLE_OPTION:
        commands.executeCommand('workbench.action.openSettings', 'sorbetto.verifyDependencies');
        break;
      case DOC_OPTION:
        env.openExternal(Uri.parse('https://sorbet.org/docs/adopting'));
        break;
    }

    return result;
  }

  return true;

  async function check(whereOrWhich: string, command: string): Promise<boolean> {
    return new Promise((resolve, _reject) =>
      exec(`${whereOrWhich} ${command}`, (error) => resolve(error ? false : true)),
    );
  }
}
