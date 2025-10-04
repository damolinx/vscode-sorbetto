import * as vscode from 'vscode';

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 250): T {
  let timer: NodeJS.Timeout | undefined;
  return function (this: any, ...args: any[]) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  } as T;
}

/**
 * Fires only when a real text editor becomes active, excludes Output, Debug
 * Console, and other non-document views.
 */
export function onSafeActiveTextEditorChanged(
  callback: (editor: vscode.TextEditor | undefined) => void,
): vscode.Disposable {
  return vscode.window.tabGroups.onDidChangeTabs(() => callback(safeActiveTextEditor()));
}

/**
 * Returns the active text editor only if it's a real file editor, excludes
 * Output, Debug Console, and other non-document views.
 */
export function safeActiveTextEditor(): vscode.TextEditor | undefined {
  const uri = safeActiveTextEditorUri();
  return (
    uri &&
    vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === uri.toString(),
    )
  );
}

/**
 * Returns the URI of the active text editor only if it's a real file editor,
 * excludes Output, Debug Console, and views.
 */
export function safeActiveTextEditorUri(): vscode.Uri | undefined {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;

  if (
    tab &&
    (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputTextDiff)
  ) {
    const uri =
      tab.input instanceof vscode.TabInputText
        ? tab.input.uri
        : (tab.input.modified ?? tab.input.original);

    return uri;
  }

  return undefined;
}
