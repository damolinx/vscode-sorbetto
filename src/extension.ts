import { commands, ExtensionContext, Uri, workspace } from 'vscode';
import { ExtensionApiProvider } from './api/extensionApiProvider';
import { mapStatus } from './api/status';
import { bundleInstall } from './commands/bundleInstall';
import * as cmdIds from './commands/commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { handleRename } from './commands/handleRename';
import { restartSorbet } from './commands/restartSorbet';
import { savePackageFiles } from './commands/savePackageFiles';
import { setupWorkspace } from './commands/setupWorkspace';
import { verifyEnvironment } from './commands/verifyEnvironment';
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
    context.statusProvider.onStatusChanged(({ status }) => setSorbetStatusContext(status)),
  );

  // Register Language Status Item
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
    rc(cmdIds.SETUP_WORKSPACE_ID, (pathOrUri?: string | Uri) =>
      setupWorkspace(context, pathOrUri)),
    rc(cmdIds.SHOW_OUTPUT_ID, (preserveFocus?: boolean) =>
      context.logOutputChannel.show(preserveFocus ?? true)),
    rc(cmdIds.SORBET_RESTART_ID, (reason = RestartReason.COMMAND) =>
      restartSorbet(context, reason)),
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
  if (context.configuration.getValue('updateRequireRelative', true)) {
    extensionContext.subscriptions.push(
      workspace.onDidRenameFiles(({ files }) => handleRename(context, files)));
  }

  // Initialize: start in disabled state until client reports status.
  setSorbetStatusContext(ServerStatus.DISABLED);

  // If enabled, verify Sorbet dependencies before running.
  if (!context.configuration.lspDisabled &&
    (!context.configuration.getValue('verifyDependencies', true) || await verifyEnvironment(context))) {
    // Start the extension.
    await context.statusProvider.startSorbet();
  }

  // Extension API
  const api = new ExtensionApiProvider(context);
  extensionContext.subscriptions.push(api);
  return api.toApi();
}

export function setSorbetStatusContext(status: ServerStatus) {
  commands.executeCommand('setContext', 'sorbetto:sorbetStatus', mapStatus(status));
}