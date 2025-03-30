import { commands, ExtensionContext, Uri, workspace } from 'vscode';
import * as cmdIds from './commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { showSorbetActions } from './commands/showSorbetActions';
import { SorbetContentProvider, SORBET_SCHEME } from './sorbetContentProvider';
import { SorbetExtensionApiImpl } from './sorbetExtensionApi';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetStatusBarEntry } from './sorbetStatusBarEntry';
import { ServerStatus, RestartReason } from './types';
import { verifyEnvironment } from './commands/verifyEnvironment';
import { verifyWorkspace } from './commands/verifyWorkspace';

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
  const rc = commands.registerCommand;
  context.subscriptions.push(
    rc(cmdIds.SHOW_ACTIONS_COMMAND_ID, () =>
      showSorbetActions()),
    rc(cmdIds.SHOW_OUTPUT_COMMAND_ID, (preserveFocus?: boolean) =>
      extensionContext.logOutputChannel.show(preserveFocus ?? true)),
    rc(cmdIds.SORBET_RESTART_COMMAND_ID, (reason?: RestartReason) =>
      extensionContext.statusProvider.restartSorbet(reason ?? RestartReason.COMMAND)),
    rc(cmdIds.VERIFY_WORKSPACE_COMMAND_ID, (pathOrUri?: string | Uri) =>
      verifyWorkspace(pathOrUri)),
  );

  // Register text editor commands
  const rtc = commands.registerTextEditorCommand;
  context.subscriptions.push(
    rtc(cmdIds.COPY_SYMBOL_COMMAND_ID, (textEditor) => copySymbolToClipboard(extensionContext, textEditor)),
  );

  // If enabled, verify Sorbet dependencies before running.
  if (extensionContext.configuration.lspConfig &&
    (!workspace.getConfiguration('sorbetto').get('verifyDependencies', true)
      || await verifyEnvironment())) {
    // Start the extension.
    await extensionContext.statusProvider.startSorbet();
  }

  // This exposes Sorbet Extension API.
  const api = new SorbetExtensionApiImpl(extensionContext);
  context.subscriptions.push(api);
  return api.toApi();
}
