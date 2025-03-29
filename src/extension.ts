import { commands, ExtensionContext, workspace } from 'vscode';
import * as cmdIds from './commandIds';
import { copySymbolToClipboard } from './commands/copySymbolToClipboard';
import { savePackageFiles } from './commands/savePackageFiles';
import { showSorbetActions } from './commands/showSorbetActions';
import { showSorbetConfigurationPicker } from './commands/showSorbetConfigurationPicker';
import {
  toggleUntypedCodeHighlighting,
  configureUntypedCodeHighlighting,
} from './commands/toggleUntypedCodeHighlighting';
import { toggleTypedFalseCompletionNudges } from './commands/toggleTypedFalseCompletionNudges';
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
    extensionContext.configuration.onLspConfigChange(
      async ({ oldLspConfig, newLspConfig }) => {
        const { statusProvider } = extensionContext;
        if (oldLspConfig && newLspConfig) {
          // Something about the config changed, so restart
          await statusProvider.restartSorbet(RestartReason.CONFIG_CHANGE);
        } else if (oldLspConfig) {
          await statusProvider.stopSorbet(ServerStatus.DISABLED);
        } else {
          await statusProvider.startSorbet();
        }
      },
    ),
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
    r(cmdIds.SHOW_ACTIONS_COMMAND_ID, () => showSorbetActions(extensionContext)),
    r(cmdIds.SHOW_CONFIG_PICKER_COMMAND_ID, () => showSorbetConfigurationPicker(extensionContext)),
    r(cmdIds.SHOW_OUTPUT_COMMAND_ID, () => extensionContext.logOutputChannel.show(true)),
    r(cmdIds.SORBET_ENABLE_COMMAND_ID, () => extensionContext.configuration.setEnabled(true)),
    r(cmdIds.SORBET_DISABLE_COMMAND_ID, () => extensionContext.configuration.setEnabled(false)),
    r(cmdIds.SORBET_RESTART_COMMAND_ID, (reason: RestartReason = RestartReason.COMMAND) =>
        extensionContext.statusProvider.restartSorbet(reason),
    ),
    r(cmdIds.SORBET_SAVE_PACKAGE_FILES, () => savePackageFiles(extensionContext)),
    r(cmdIds.TOGGLE_HIGHLIGHT_UNTYPED_COMMAND_ID, () => toggleUntypedCodeHighlighting(extensionContext)),
    r(cmdIds.CONFIGURE_HIGHLIGHT_UNTYPED_COMMAND_ID, () => configureUntypedCodeHighlighting(extensionContext)),
    r(cmdIds.TOGGLE_TYPED_FALSE_COMPLETION_NUDGES_COMMAND_ID, () => toggleTypedFalseCompletionNudges(extensionContext)),
  );

  // Start the extension.
  await extensionContext.statusProvider.startSorbet();

  // This exposes Sorbet Extension API.
  const api = new SorbetExtensionApiImpl(extensionContext);
  context.subscriptions.push(api);
  return api.toApi();
}
