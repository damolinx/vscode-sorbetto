import { commands, ExtensionContext, Uri, workspace } from 'vscode';
import { SorbetExtensionApiImpl } from './api/sorbetExtensionApi';
import { mapStatus } from './api/sorbetStatus';
import * as cmdIds from './commandIds';
import { bundleInstall } from './commands/bundleInstall';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { handleRename } from './commands/handleRename';
import { savePackageFiles } from './commands/savePackageFiles';
import { verifyEnvironment } from './commands/verifyEnvironment';
import { setupWorkspace } from './commands/setupWorkspace';
import { registerGemfileCodeLensProvider } from './providers/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './providers/gemfileCompletionProvider';
import { registerRequireCompletionProvider } from './providers/requireCompletionProvider';
import { registerSorbetContentProvider } from './providers/sorbetContentProvider';
import { registerTypedOptionsCompletionProvider } from './providers/typedOptionsCompletionProvider';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';
import { ServerStatus, RestartReason } from './types';

/**
 * Extension entrypoint.
 */
export async function activate(extensionContext: ExtensionContext) {
  const context = new SorbetExtensionContext(extensionContext);

  extensionContext.subscriptions.push(
    context,
    context.configuration.onDidChangeLspConfig(
      async ({ previousConfig, config }) => {
        const { statusProvider } = context;
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
    context.configuration.onDidChangeLspOptions(() =>
      context.statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE)),
    context.statusProvider.onStatusChanged((e) => {
      commands.executeCommand('setContext', 'sorbetto:sorbetStatus', mapStatus(e.status));
    }),
  );

  const statusBarEntry = new SorbetLanguageStatus(context);
  extensionContext.subscriptions.push(statusBarEntry);

  // Register providers
  extensionContext.subscriptions.push(
    registerGemfileCodeLensProvider(),
    registerGemfileCompletionProvider(),
    registerRequireCompletionProvider(),
    registerSorbetContentProvider(context),
    registerTypedOptionsCompletionProvider(),
  );

  // Register commands
  const rc = commands.registerCommand;
  extensionContext.subscriptions.push(
    rc(cmdIds.BUNDLE_INSTALL_ID, (gemfile: string | Uri) =>
      bundleInstall(context, gemfile)),
    rc(cmdIds.SHOW_OUTPUT_ID, (preserveFocus?: boolean) =>
      context.logOutputChannel.show(preserveFocus ?? true)),
    rc(cmdIds.SORBET_RESTART_ID, (reason?: RestartReason) =>
      context.statusProvider.restartSorbet(reason ?? RestartReason.COMMAND)),
    rc(cmdIds.SETUP_WORKSPACE_ID, (pathOrUri?: string | Uri) =>
      setupWorkspace(context, pathOrUri)),
  );

  // Register Sorbet-spec commands
  extensionContext.subscriptions.push(
    rc(cmdIds.SORBET_SAVE_PACKAGE_FILES_ID, () =>
      savePackageFiles(context)),
  );

  // Register text editor commands
  const rtc = commands.registerTextEditorCommand;
  extensionContext.subscriptions.push(
    rtc(cmdIds.COPY_SYMBOL_ID, (textEditor) =>
      copySymbolToClipboard(context, textEditor)),
  );

  // Register configurable features
  if (workspace.getConfiguration('sorbetto').get('updateRequireRelative', true)) {
    extensionContext.subscriptions.push(
      workspace.onDidRenameFiles((e) => handleRename(context, e.files)));
  }


  // If enabled, verify Sorbet dependencies before running.
  if (context.configuration.lspConfig &&
    (!workspace.getConfiguration('sorbetto').get('verifyDependencies', true)
      || await verifyEnvironment(context))) {
    // Start the extension.
    await context.statusProvider.startSorbet();
  }

  // This exposes Sorbet Extension API.
  const api = new SorbetExtensionApiImpl(context);
  extensionContext.subscriptions.push(api);
  return api.toApi();
}
