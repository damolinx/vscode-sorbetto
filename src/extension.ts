import * as vscode from 'vscode';
import { CommandIds } from './commandIds';
import { autocorrectAll } from './commands/autocorrectAll';
import { bundleInstall } from './commands/bundleInstall';
import { copySymbol } from './commands/copySymbol';
import { createPackage } from './commands/createPackage';
import { debugRubyFile } from './commands/debugRubyFile';
import { handleRename } from './commands/handleRename';
import { openPackage } from './commands/openPackage';
import { openSettings } from './commands/openSettings';
import { peekHierarchyReferences } from './commands/peekHierarchyReferences';
import { runClientAction } from './commands/runClientAction';
import { runRubyFile } from './commands/runRubyFile';
import { savePackageFiles } from './commands/savePackageFiles';
import { sendToSorbetRun } from './commands/sendToSorbetRun';
import { setupWorkspace } from './commands/setupWorkspace';
import { showClientActions } from './commands/showClientActions';
import { updateRbis, UpdateRbiType } from './commands/updateRbi';
import { ExtensionContext } from './extensionContext';
import { registerContextValueHandlers } from './extensionContextValues';
import { registerProviders } from './providers/providers';
import { SorbetLanguageStatus } from './sorbetLanguageStatus';

/**
 * Extension entrypoint.
 */
export async function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  context.disposables.push(new SorbetLanguageStatus(context));
  registerContextValueHandlers(context);
  registerProviders(context);

  // Register commands
  const rc = vscode.commands.registerCommand;
  context.disposables.push(
    rc(CommandIds.AutocorrectAll, (contextUri?: vscode.Uri, codes?: number[]) =>
      autocorrectAll(context, contextUri, codes),
    ),
    rc(CommandIds.BundleInstall, (gemfile: vscode.Uri) =>
      bundleInstall(context, gemfile, 'install'),
    ),
    rc(CommandIds.BundleUpdate, (gemfile: vscode.Uri) => bundleInstall(context, gemfile, 'update')),
    rc(CommandIds.CreatePackage, (contextUri: vscode.Uri) => createPackage(context, contextUri)),
    rc(CommandIds.DebugRubyFile, (uri?: vscode.Uri) => debugRubyFile(context, uri)),
    rc(CommandIds.OpenPackage, (contextUri?: vscode.Uri) => openPackage(context, contextUri)),
    rc(CommandIds.OpenSettings, (contextUri?: vscode.Uri, setting?: string) =>
      openSettings(context, contextUri, setting),
    ),
    rc(CommandIds.RunRubyFile, (uri?: vscode.Uri) => runRubyFile(context, uri)),
    rc(CommandIds.SavePackageFiles, () => savePackageFiles(context)),
    rc(CommandIds.SetupWorkspace, (uri?: vscode.Uri) => setupWorkspace(context, uri)),
    rc(CommandIds.ShowClientActions, (contextUri?: vscode.Uri) =>
      showClientActions(context, contextUri),
    ),
    rc(CommandIds.ShowOutput, (preserveFocus?: boolean) => context.log.show(preserveFocus ?? true)),
    rc(CommandIds.SorbetRestart, (contextUri?: vscode.Uri) =>
      runClientAction(context, 'restart', contextUri),
    ),
    rc(CommandIds.SorbetStart, (contextUri?: vscode.Uri) =>
      runClientAction(context, 'start', contextUri),
    ),
    rc(CommandIds.SorbetStop, (contextUri?: vscode.Uri) =>
      runClientAction(context, 'stop', contextUri),
    ),
    rc(CommandIds.UpdataRbis, (updateType?: UpdateRbiType) => updateRbis(context, updateType)),
  );

  // Register text editor commands
  const rtc = vscode.commands.registerTextEditorCommand;
  context.disposables.push(
    rtc(CommandIds.CopySymbol, (textEditor: vscode.TextEditor) => copySymbol(context, textEditor)),
    rtc(CommandIds.PeekHierarchyReferences, (textEditor: vscode.TextEditor) =>
      peekHierarchyReferences(context, textEditor),
    ),
    rtc(CommandIds.SendToSorbetRun, (textEditor: vscode.TextEditor) =>
      sendToSorbetRun(context, textEditor),
    ),
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
}
