import * as vscode from 'vscode';
import { createExtensionApi } from './api/extensionApiProvider';
import * as cmdIds from './commandIds';
import { autocorrectAll } from './commands/autocorrectAll';
import { bundleInstall } from './commands/bundleInstall';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { debugRubyFile } from './commands/debugRubyFile';
import { handleRename } from './commands/handleRename';
import { openSettings } from './commands/openSettings';
import { restartSorbet } from './commands/restartSorbet';
import { runRubyFile } from './commands/runRubyFile';
import { savePackageFiles } from './commands/savePackageFiles';
import { setupWorkspace } from './commands/setupWorkspace';
import { ExtensionContext } from './extensionContext';
import { registerContextValueHandlers } from './extensionContextValues';
import { registerSorbetConfigProviders } from './providers/config/sorbetConfigProviders';
import { registerGemfileProviders } from './providers/gemfile/gemfileProviders';
import { registerRequireCompletionProvider } from './providers/requireCompletionProvider';
import { registerRequireDefinitionProvider } from './providers/requireDefinitionProvider';
import { registerSorbetContentProvider } from './providers/sorbetContentProvider';
import { registerTypedOptionsCompletionProvider } from './providers/typedOptionsCompletionProvider';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';

/**
 * Extension entrypoint.
 */
export async function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  context.disposables.push(new SorbetLanguageStatus(context));

  registerSorbetConfigProviders(context);
  registerContextValueHandlers(context);
  registerGemfileProviders(context);
  registerRequireCompletionProvider(context);
  registerRequireDefinitionProvider(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);

  // Register commands
  const rc = vscode.commands.registerCommand;
  context.disposables.push(
    rc(cmdIds.AUTOCORRECT_ALL_ID, (code: string | number, contextUri: vscode.Uri) =>
      autocorrectAll(context, contextUri, code),
    ),
    rc(cmdIds.BUNDLE_INSTALL_ID, (gemfile: string | vscode.Uri) =>
      bundleInstall(context, gemfile, 'install'),
    ),
    rc(cmdIds.BUNDLE_UPDATE_ID, (gemfile: string | vscode.Uri) =>
      bundleInstall(context, gemfile, 'update'),
    ),
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
  context.disposables.push(
    rtc(cmdIds.COPY_SYMBOL_ID, (textEditor) => copySymbolToClipboard(context, textEditor)),
  );

  // Register configurable features
  if (context.configuration.getValue('updateRequireRelative', true)) {
    context.disposables.push(
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
