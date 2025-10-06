import * as vscode from 'vscode';
import { createExtensionApi } from './api/extensionApiProvider';
import { autocorrectAll } from './commands/autocorrectAll';
import { bundleInstall } from './commands/bundleInstall';
import * as cmdIds from './commands/commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { debugRubyFile } from './commands/debugRubyFile';
import { handleRename } from './commands/handleRename';
import { openSettings } from './commands/openSettings';
import { restartSorbet } from './commands/restartSorbet';
import { runRubyFile } from './commands/runRubyFile';
import { savePackageFiles } from './commands/savePackageFiles';
import { setupWorkspace } from './commands/setupWorkspace';
import { registerGemfileCodeLensProvider } from './providers/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './providers/gemfileCompletionProvider';
import { registerRequireCompletionProvider } from './providers/requireCompletionProvider';
import { registerRequireDefinitionProvider } from './providers/requireDefinitionProvider';
import { registerSorbetContentProvider } from './providers/sorbetContentProvider';
import { registerTypedOptionsCompletionProvider } from './providers/typedOptionsCompletionProvider';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { registerContextValueHandlers } from './sorbetExtensionContextValues';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';

/**
 * Extension entrypoint.
 */
export async function activate(extensionContext: vscode.ExtensionContext) {
  const context = new SorbetExtensionContext(extensionContext);
  extensionContext.subscriptions.push(context, ...registerContextValueHandlers(context));

  // Register Language Status Item
  const statusBarEntry = new SorbetLanguageStatus(context);
  extensionContext.subscriptions.push(statusBarEntry);

  // Register providers
  extensionContext.subscriptions.push(
    registerGemfileCodeLensProvider(),
    registerGemfileCompletionProvider(),
    registerRequireCompletionProvider(),
    registerRequireDefinitionProvider(),
    registerSorbetContentProvider(context),
    registerTypedOptionsCompletionProvider(),
  );

  // Register commands
  const rc = vscode.commands.registerCommand;
  extensionContext.subscriptions.push(
    rc(cmdIds.AUTOCORRECT_ALL_ID, (code: string | number, contextUri: vscode.Uri) =>
      autocorrectAll(context, contextUri, code),
    ),
    rc(cmdIds.BUNDLE_INSTALL_ID, (gemfile: string | vscode.Uri) => bundleInstall(context, gemfile)),
    rc(cmdIds.DEBUG_RUBY_FILE_ID, (pathOrUri?: string | vscode.Uri) =>
      debugRubyFile(context, pathOrUri),
    ),
    rc(cmdIds.OPEN_SETTINGS_ID, (pathOrUri: string | vscode.Uri, setting?: string) =>
      openSettings(context, pathOrUri, setting),
    ),
    rc(cmdIds.RUN_RUBY_FILE_ID, (pathOrUri?: string | vscode.Uri) =>
      runRubyFile(context, pathOrUri),
    ),
    rc(cmdIds.SETUP_WORKSPACE_ID, (pathOrUri?: string | vscode.Uri) =>
      setupWorkspace(context, pathOrUri),
    ),
    rc(cmdIds.SHOW_OUTPUT_ID, (preserveFocus?: boolean) =>
      context.logOutputChannel.show(preserveFocus ?? true),
    ),
    rc(cmdIds.SORBET_RESTART_ID, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'restart', pathOrUri),
    ),
    rc(cmdIds.SORBET_START_ID, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'start', pathOrUri),
    ),
    rc(cmdIds.SORBET_STOP_ID, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'stop', pathOrUri),
    ),
    rc(cmdIds.SORBET_SAVE_PACKAGE_FILES_ID, () => savePackageFiles(context)),
  );

  // Register text editor commands
  const rtc = vscode.commands.registerTextEditorCommand;
  extensionContext.subscriptions.push(
    rtc(cmdIds.COPY_SYMBOL_ID, (textEditor) => copySymbolToClipboard(context, textEditor)),
  );

  // Register configurable features
  if (context.configuration.getValue('updateRequireRelative', true)) {
    extensionContext.subscriptions.push(
      vscode.workspace.onDidRenameFiles(({ files }) => handleRename(context, files)),
    );
  }

  // Initialize client manager with existing workspace folders.
  vscode.workspace.workspaceFolders?.forEach((folder) =>
    context.clientManager.addWorkspace(folder),
  );

  // Extension API
  return createExtensionApi(context);
}
