import { commands, ExtensionContext, languages, Uri, workspace } from 'vscode';
import { SorbetExtensionApiImpl } from './api/sorbetExtensionApi';
import { mapStatus } from './api/sorbetStatus';
import * as cmdIds from './commandIds';
import { bundleInstall } from './commands/bundleInstall';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { savePackageFiles } from './commands/savePackageFiles';
import { verifyEnvironment } from './commands/verifyEnvironment';
import { setupWorkspace } from './commands/setupWorkspace';
import { BundleCodeLensProvider, GEMFILE_SELECTOR } from './providers/bundleCodeLensProvider';
import { SorbetContentProvider, SORBET_SCHEME } from './sorbetContentProvider';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';
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
      extensionContext.statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE)),
    extensionContext.statusProvider.onStatusChanged((e) => {
      commands.executeCommand('setContext', 'sorbetto:sorbetStatus', mapStatus(e.status));
    }),
  );

  const statusBarEntry = new SorbetLanguageStatus(extensionContext);
  context.subscriptions.push(statusBarEntry);

  // Register providers
  context.subscriptions.push(
    languages.registerCodeLensProvider(
      GEMFILE_SELECTOR,
      new BundleCodeLensProvider(),
    ),
    workspace.registerTextDocumentContentProvider(
      SORBET_SCHEME,
      new SorbetContentProvider(extensionContext),
    ),
  );

  // Register commands
  const rc = commands.registerCommand;
  context.subscriptions.push(
    rc(cmdIds.BUNDLE_INSTALL_ID, (gemfile: string | Uri) =>
      bundleInstall(extensionContext, gemfile)),
    rc(cmdIds.SHOW_OUTPUT_ID, (preserveFocus?: boolean) =>
      extensionContext.logOutputChannel.show(preserveFocus ?? true)),
    rc(cmdIds.SORBET_RESTART_ID, (reason?: RestartReason) =>
      extensionContext.statusProvider.restartSorbet(reason ?? RestartReason.COMMAND)),
    rc(cmdIds.SETUP_WORKSPACE_ID, (pathOrUri?: string | Uri) =>
      setupWorkspace(extensionContext, pathOrUri)),
  );

  // Register Sorbet-spec commands
  if (!(await commands.getCommands(true)).includes(cmdIds.SORBET_SAVE_PACKAGE_FILES_ID)) {
    context.subscriptions.push(
      rc(cmdIds.SORBET_SAVE_PACKAGE_FILES_ID, () =>
        savePackageFiles(extensionContext)),
    );
  }

  // Register text editor commands
  const rtc = commands.registerTextEditorCommand;
  context.subscriptions.push(
    rtc(cmdIds.COPY_SYMBOL_ID, (textEditor) =>
      copySymbolToClipboard(extensionContext, textEditor)),
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
