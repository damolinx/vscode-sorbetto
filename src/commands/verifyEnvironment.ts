import { exec } from 'child_process';
import { commands, env, Uri, window } from 'vscode';

export async function verifyEnvironment() {
  const commandsToCheck = ['srb', 'bundle'];
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
    const DOC_OPTION = 'Documentation';
    const option = await window.showErrorMessage(
      `Following dependencies are missing: ${missingCommands.join(', ')}. Sorbet will not be started automatically.`,
      START_OPTION,
      CONFIGURE_OPTION,
      DOC_OPTION,
    );

    // Don't await
    if (option === START_OPTION) {
      result = true;
    } else if (option === CONFIGURE_OPTION) {
      commands.executeCommand('workbench.action.openSettings', 'sorbetto.verifyDependencies');
    } else if (option === DOC_OPTION) {
      env.openExternal(Uri.parse('https://sorbet.org/docs/adopting'));
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
