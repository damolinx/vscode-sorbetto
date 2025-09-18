import { commands, ExtensionContext, Uri, workspace } from 'vscode';
import { createExtensionApi } from './api/extensionApiProvider';
import { mapStatus } from './api/status';
import { autocorrectAll } from './commands/autocorrectAll';
import { bundleInstall } from './commands/bundleInstall';
import * as cmdIds from './commands/commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { debugRubyFile } from './commands/debugRubyFile';
import { handleRename } from './commands/handleRename';
import { restartSorbet } from './commands/restartSorbet';
import { runRubyFile } from './commands/runRubyFile';
import { savePackageFiles } from './commands/savePackageFiles';
import { setupWorkspace } from './commands/setupWorkspace';
import { registerGemfileCodeLensProvider } from './providers/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './providers/gemfileCompletionProvider';
import { registerRequireCompletionProvider } from './providers/requireCompletionProvider';
import { registerSorbetContentProvider } from './providers/sorbetContentProvider';
import { registerTypedOptionsCompletionProvider } from './providers/typedOptionsCompletionProvider';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';
import { LspStatus } from './types';

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
    rc(cmdIds.AUTOCORRECT_ALL_ID, (code: string | number, contextUri: Uri) =>
      autocorrectAll(context, contextUri, code),
    ),
    rc(cmdIds.BUNDLE_INSTALL_ID, (gemfile: string | Uri) => bundleInstall(context, gemfile)),
    rc(cmdIds.DEBUG_RUBY_FILE_ID, (pathOrUri?: string | Uri) => debugRubyFile(context, pathOrUri)),
    rc(cmdIds.RUN_RUBY_FILE_ID, (pathOrUri?: string | Uri) => runRubyFile(context, pathOrUri)),
    rc(cmdIds.SETUP_WORKSPACE_ID, (pathOrUri?: string | Uri) => setupWorkspace(context, pathOrUri)),
    rc(cmdIds.SHOW_OUTPUT_ID, (preserveFocus?: boolean) =>
      context.logOutputChannel.show(preserveFocus ?? true),
    ),
    rc(cmdIds.SORBET_RESTART_ID, (pathOrUri?: string | Uri) => restartSorbet(context, pathOrUri)),
    rc(cmdIds.SORBET_SAVE_PACKAGE_FILES_ID, () => savePackageFiles(context)),
  );

  // Register text editor commands
  const rtc = commands.registerTextEditorCommand;
  extensionContext.subscriptions.push(
    rtc(cmdIds.COPY_SYMBOL_ID, (textEditor) => copySymbolToClipboard(context, textEditor)),
  );

  // Register configurable features
  if (context.configuration.getValue('updateRequireRelative', true)) {
    extensionContext.subscriptions.push(
      workspace.onDidRenameFiles(({ files }) => handleRename(context, files)),
    );
  }

  // Initialize: start in disabled state until client reports status.
  setSorbetStatusContext(LspStatus.Disabled);

  // Initialize client manager with existing workspace folders.
  workspace.workspaceFolders?.forEach((folder) => context.clientManager.addWorkspace(folder));

  // Extension API
  return createExtensionApi(context);
}

export function setSorbetStatusContext(status: LspStatus) {
  commands.executeCommand('setContext', 'sorbetto:sorbetStatus', mapStatus(status));
}
