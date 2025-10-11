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
 * Fires only when a main-area text editor becomes active, excludes Output, Debug
 * Console, and other non-document views.
 */
export function onMainAreaActiveTextEditorChanged(
  callback: (editor: vscode.TextEditor | undefined) => void,
): vscode.Disposable {
  return vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor?.viewColumn) {
      callback(editor);
    }
  });
}

/**
 * Returns the URI of the active text editor only if it's a main-area file editor,
 * excludes Output, Debug Console, and views.
 */
export function mainAreaActiveTextEditorUri(): vscode.Uri | undefined {
  let uri: vscode.Uri | undefined;

  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (tab) {
    if (tab.input instanceof vscode.TabInputText) {
      uri = tab.input.uri;
    } else if (tab.input instanceof vscode.TabInputTextDiff) {
      uri = tab.input.modified ?? tab.input.original;
    }
  }

  return uri;
}
