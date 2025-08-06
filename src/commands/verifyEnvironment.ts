import { commands, env, Uri, window } from 'vscode';
import { isAvailable } from '../common/processUtils';
import { SorbetExtensionContext } from '../sorbetExtensionContext';

export async function verifyEnvironment(_context: SorbetExtensionContext) {
  const commandsToCheck = ['srb', 'bundle'];
  const missingCommands: string[] = [];

  for (const command of commandsToCheck) {
    const exists = await isAvailable(command);
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
        commands.executeCommand('workbench.action.openWorkspaceSettings', 'sorbetto.sorbet');
        break;
      case DISABLE_OPTION:
        commands.executeCommand('workbench.action.openWorkspaceSettings', 'sorbetto.verifyDependencies');
        break;
      case DOC_OPTION:
        env.openExternal(Uri.parse('https://sorbet.org/docs/adopting'));
        break;
    }

    return result;
  }

  return true;
}
