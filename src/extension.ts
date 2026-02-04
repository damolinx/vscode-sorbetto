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
import { restartSorbet } from './commands/restartSorbet';
import { runRubyFile } from './commands/runRubyFile';
import { savePackageFiles } from './commands/savePackageFiles';
import { sendToSorbetRun } from './commands/sendToSorbetRun';
import { setupWorkspace } from './commands/setupWorkspace';
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
    rc(CommandIds.AutocorrectAll, (pathOrUri?: string | vscode.Uri, codes?: number[]) =>
      autocorrectAll(context, pathOrUri, codes),
    ),
    rc(CommandIds.BundleInstall, (gemfile: string | vscode.Uri) =>
      bundleInstall(context, gemfile, 'install'),
    ),
    rc(CommandIds.BundleUpdate, (gemfile: string | vscode.Uri) =>
      bundleInstall(context, gemfile, 'update'),
    ),
    rc(CommandIds.CreatePackage, (pathOrUri: string | vscode.Uri) =>
      createPackage(context, pathOrUri),
    ),
    rc(CommandIds.DebugRubyFile, (pathOrUri?: string | vscode.Uri) =>
      debugRubyFile(context, pathOrUri),
    ),
    rc(CommandIds.OpenPackage, (pathOrUri: string | vscode.Uri) => openPackage(context, pathOrUri)),
    rc(CommandIds.OpenSettings, (pathOrUri: string | vscode.Uri, setting?: string) =>
      openSettings(context, pathOrUri, setting),
    ),
    rc(CommandIds.RunRubyFile, (pathOrUri?: string | vscode.Uri) =>
      runRubyFile(context, pathOrUri),
    ),
    rc(CommandIds.SavePackageFiles, () => savePackageFiles(context)),
    rc(CommandIds.SetupWorkspace, (pathOrUri?: string | vscode.Uri) =>
      setupWorkspace(context, pathOrUri),
    ),
    rc(CommandIds.ShowOutput, (preserveFocus?: boolean) =>
      context.logOutputChannel.show(preserveFocus ?? true),
    ),
    rc(CommandIds.SorbetRestart, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'restart', pathOrUri),
    ),
    rc(CommandIds.SorbetStart, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'start', pathOrUri),
    ),
    rc(CommandIds.SorbetStop, (pathOrUri?: string | vscode.Uri) =>
      restartSorbet(context, 'stop', pathOrUri),
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
