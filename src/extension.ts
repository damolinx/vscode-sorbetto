import { commands, ExtensionContext, workspace } from 'vscode';
import * as cmdIds from './commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { savePackageFiles } from './commands/savePackageFiles';
import { showSorbetActions } from './commands/showSorbetActions';
import { SorbetContentProvider, SORBET_SCHEME } from './sorbetContentProvider';
import { SorbetExtensionApiImpl } from './sorbetExtensionApi';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetStatusBarEntry } from './sorbetStatusBarEntry';
import { ServerStatus, RestartReason } from './types';

/**
 * Extension entrypoint.
 */
export async function activate(context: ExtensionContext) {
  const extensionContext = new SorbetExtensionContext(context);

  context.subscriptions.push(
    extensionContext,
    extensionContext.configuration.onDidChangeLspConfig(
      async ({ previousConfig, config }) => {
        const { statusProvider } = extensionContext;
        if (previousConfig && config) {
          // Something about the config changed, so restart
          await statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
        } else if (previousConfig) {
          await statusProvider.stopSorbet(ServerStatus.DISABLED);
        } else {
          await statusProvider.startSorbet();
        }
      },
    ),
    extensionContext.configuration.onDidChangeLspOptions(() =>
      extensionContext.statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE))
  );

  const statusBarEntry = new SorbetStatusBarEntry(extensionContext);
  context.subscriptions.push(statusBarEntry);

  // Register providers
  context.subscriptions.push(
    workspace.registerTextDocumentContentProvider(
      SORBET_SCHEME,
      new SorbetContentProvider(extensionContext),
    ),
  );

  // Register commands
  const r = commands.registerCommand;
  context.subscriptions.push(
    r(cmdIds.COPY_SYMBOL_COMMAND_ID, () => copySymbolToClipboard(extensionContext)),
    r(cmdIds.SHOW_ACTIONS_COMMAND_ID, () => showSorbetActions()),
    r(cmdIds.SHOW_OUTPUT_COMMAND_ID, () => extensionContext.logOutputChannel.show(true)),
    r(cmdIds.SORBET_RESTART_COMMAND_ID, (reason: RestartReason = RestartReason.COMMAND) =>
        extensionContext.statusProvider.restartSorbet(reason),
    ),
    r(cmdIds.SORBET_SAVE_PACKAGE_FILES, () => savePackageFiles(extensionContext)),
  );

  // Start the extension.
  await extensionContext.statusProvider.startSorbet();

  // This exposes Sorbet Extension API.
  const api = new SorbetExtensionApiImpl(extensionContext);
  context.subscriptions.push(api);
  return api.toApi();
}
