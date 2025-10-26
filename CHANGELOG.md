# Changelog

## 0.3.7
- Add **Update** action to Gemfile.
- Improved `typed` auto-completion edits.
- Misc. internal code improvements.

## 0.3.6
- Expand context tracking to include additional editor types for more accurate resolution.
- Scope configuration-changed events to relevant clients to reduce noise.
- Handle `highlightUntypedDiagnosticSeverity` setting change via `workspace/didChangeConfiguration` notification instead of using a client restart.
  - Documentation states this is possible but Sorbet incorrectly reports only `highlightUntyped` is supported in error message.
- Fix: VSCode and LSP's `DiagnosticSeverity` are incompatible by value, as they are 0- and 1- based enums respectively.
- Fix: Tracking of Sorbet operations is not multi-root aware.
- Fix: Tracking of active editor from 0.3.5 was incomplete.
- Fix: `Disabled` configuration shows **Error** status instead of expected **Disabled**.

## 0.3.5
- Add **Sorbetto: Start Sorbet** and **Sorbetto: Stop Sorbet** commands.
- **Setup Workspace** now attempts to start Sorbet after setup terminal is dismissed.
- Improve lifecycle-methods logging.
- Fix: Tracking of active editor fails in a multi-root workspace when there are multi-tabgroups.

## 0.3.4
- Language status item entries show the target workspace name (only on multi-root with multiple Ruby-Sorbet workspaces).
- Improve context editor and workspace tracking.
- Update logs entries.

## 0.3.3
- Improve tracking of process lifecycle.
- Improve reliability of the **Restart Sorbet** command when Sorbet doesn't exit but does not start the LSP service either.

## 0.3.2
- Fix: `sorbet` content provider does not resolve files after multi-root update.

## 0.3.1
 - **Run Ruby File** and **Debug Ruby File** commmands force-save files before running.
 - Support navigation to `require_relative` target via a definition provider (enables **Peek**).
 - Fix: `require_relative` completes incorrectly partial paths.

## 0.3.0
- Multi-root workspace support, including per-folder Sorbet clients configurable individually or at the workspace level.

## 0.2.25
- `Beta` and `Experimental` configurations are now settings.
- Update README.
- Fix: Empty `Custom` configuration leads to silent failure / meaningless log entry.

## 0.2.24
- New extension icon.
- Tweak LSP diagnostic messages to be more compact.
- Add **Enable Rbs Support**, **Enable Requires Ancestor** settings.

## 0.2.23
- Improve getting started experience:
  - Add **Run Ruby File** and **Debug Ruby File** command.
  - Improve dependency verification: **Setup Workspace** command, **Install** CodeLens.
  - Update snippets:
    - Split file and fragment snippets so the UI only presents the relevant ones.
    - Remove fragment snippets that collide with ones provided by Sorbet already (`enum`, `struct`).
    - Add `require 'sorbet-runtime'` to file snippets.
- Fix: Retry attempt count not being updated.

## 0.2.22
- Add `sorbetto.alwaysShowStatusItems` setting to show the language status items for all editors, not just Ruby.
- Restart loop increased to 15 minutes, with exponential backoff.

## 0.2.21
- Fix: **Sorbetto: Restart** is not available in all expected cases.

## 0.2.20
- Fix: Commands do not get enabled/disabled on client transitions.
- Fix: Do not offer **Apply Sorbet fixes for error «code» to all files** when Sorbet does not offer a fix.

## 0.2.19
- General improvements.

## 0.2.18
- Replace `sorbetto.sorbetLspBaseConfiguration` with `sorbetto.sorbetTypecheckCommand` setting for improved flexibility. `sorbetto.sorbetLspCustomConfiguration` remains purely for LSP configuration.
- Update the name of the new quickfix action to **Apply Sorbet fixes for error «code» to all files**.
- Faster Sorbet workspace check.

## 0.2.17
- Add `sorbetto.enableWatchman` setting to control forced or automatic use of `watchman`.
- Fix: Multiple Sorbet clients active after restart.

## 0.2.16
- Quick-fix action to fix all instances of a given error code across all files.

## 0.2.15
- Improve completion provider behavior for `Gemfile` files.
- Fix: Highlight severity setting is serialized as a name, rather than a value, when sent to Sorbet.

## 0.2.14
- Support controlling untyped-code highlight severity.

## 0.2.13
- Improve **Copy Symbol to Clipboard**:
  - Enable even when there is a selection.
  - Hide when there is no workspace open.

## 0.2.12
- Improve handling of no workspace, workspace not set up, and Sorbet-disabled scenarios.

## 0.2.11
- Upgrade minimum VS Code version to 1.99.
- Updates for future support of multi-root workspaces:
  - Language Status item now tracks the current active text editor.
  - Remove dependency verification on extension activation.
  - Remove `sorbetto.verifyDependencies` setting.

## 0.2.10
- Use `$(ruby)` icon on status language entries.
- Update Sorbet LSP start logic:
  - Limit restart attempts to 15 (previously unlimited).
  - Set time between restarts to 10s (previously 7s).
  - Wire legacy retry exit code 11.

## 0.2.9
- Rewrite `SorbetClient` and update `SorbetClientManager`.
  - Restart reason tracking is coarser after this.

## 0.2.8
- Simplify `SorbetLanguageClient.dispose` logic.

## 0.2.7
- Fix: Inconsistent handling of `ENOENT` and errno=127. Further work is needed.
- Fix: Custom configuration update does not restart Sorbet.

## 0.2.6
- Internal implementation changes.
- Clean up `error` log formatting coming from `vscode-LanguageClient`.
- Fix: Tracking of `restartFilePattern`.
- Metrics are visible when using `trace`-level logging (previously they were just dropped).

## 0.2.5
- Fix: Error notifications when logging to Output Pane.
- Replace `sorbetto.sorbetLspConfigurationAdditionalArguments` setting with `sorbetto.sorbetLspBaseConfiguration` for improved flexibility.
- Several changes to configuration handling, including fixes.

## 0.2.4
- Roll back anonymous client.

## 0.2.3
- Upgrade minimum VS Code version to 1.96.
- Remove `sorbetto.revealOutputOnError` setting.
- Improve internal definitions of Sorbet LSP APIs as defined in [docs](https://sorbet.org/docs/lsp#initialize-request).

## 0.2.2
- Improve updating of `require_relative` statements on file renames.
- Handle `Disabled` state better from different actions.
- Use `workbench.action.openWorkspaceSettings` instead of `workbench.action.openSettings` when opening settings.

## 0.2.1
- Autocomplete in `Gemfile` adds trailing quote if needed.
- Autocomplete `require_relative` paths.

## 0.2.0
- Update `require_relative` on rename.
  - Limited to files being renamed, not ones referencing them (future).
- `Disabled` status shows `Start` instead of `Output` action.

## 0.1.10
- Improve detection of relevant configuration changes.
- Add https://rubygems.org/ as an autocomplete provider in `Gemfile`.

## 0.1.9
- Add `package` snippet.
- Add `watchman` to environment verification list.
- Update LSP configuration-related names so they match `sorbetto.sorbetLsp`:
  - `additionalSorbetLspConfigurationArguments` to `sorbetLspConfigurationAdditionalArguments`.
  - `sorbetCustomLspConfiguration` to `sorbetLspCustomConfiguration`.
- `# typed` -sigil completion provider.

## 0.1.8
- Update snippets.
- Add icon.
- Add **Install** CodeLens to `Gemfile`.
- Change **Verify Workspace** to **Setup Workspace**, which follows https://sorbet.org/docs/adopting.

## 0.1.7
- Provide `sorbetto:sorbetStatus` context value.
- **Copy Symbol to Clipboard** UX improvements:
  - Progress UI only shown if operation takes longer than 2s.
  - Disabled whenever Sorbet is in `error` or `disabled` state.
- Internal clean-up.

## 0.1.6
- Update `Ruby` language item entries.
- Remove **Sorbetto: Configure** command.
- Remove **Sorbetto: Show Output** command.
- Fix: Missing `sorbet.savePackageFiles` command used by Sorbet.

## 0.1.5
- Update snippets.

## 0.1.4
- Handle `ENOENT` for a configuration command as a non-recoverable `Error`.

## 0.1.3
- Update settings open when configuring activation verification.
- Update the status messages when performing an operation.

## 0.1.2
- Provide snippets for several common Sorbet constructs.

## 0.1.1
- Move `Sorbet` status bar item to be part of the `Ruby` language item for more standard behavior.
- Remove unnecessary files from the `.vsix` package.

## 0.1.0
- Verification features:
  - Verify required `srb`, `bundle` during extension startup (can be disabled via config).
  - **Verify Workspace** command allows you to set up a workspace with necessary files to get Sorbet running.
- Configuration design is changed from that used by the official extension:
  - `Memento`-based setting overrides are removed, preferring standard VS Code settings behavior.
  - Changing configuration via the **Settings** UI now automatically restarts the Sorbet Language Server when necessary. As a result, **Toggle \*** commands are removed to simplify UX.

- Initial version, forked from official 0.3.41.
