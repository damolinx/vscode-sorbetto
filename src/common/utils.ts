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
 * Returns the URI of the active {@link vscode.TextEditor} in the editor-area.
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

/**
 * Returns the URI of the active editor in the editor-area. It might not be a
 * {@link vscode.TextEditor}, prefer {@link mainAreaActiveTextEditorUri} if
 * that is needed.
 */
export function mainAreaActiveEditorUri(): vscode.Uri | undefined {
  let uri: vscode.Uri | undefined;
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (tab) {
    if (
      tab.input instanceof vscode.TabInputText ||
      tab.input instanceof vscode.TabInputCustom ||
      tab.input instanceof vscode.TabInputNotebook
    ) {
      uri = tab.input.uri;
    } else if (
      tab.input instanceof vscode.TabInputTextDiff ||
      tab.input instanceof vscode.TabInputNotebookDiff
    ) {
      uri = tab.input.modified ?? tab.input.original;
    }
  }

  return uri;
}
