# Version history

## 0.1.10
- Improve detection of relevant configuration changes.
- Wire https://rubygems.org/ as autocomplete provider in Gemfile.

## 0.1.9
- Add `package` snippet.
- Add `watchman` to environment verification list.
- Update LSP configuration -related names so they match `sorbetto.sorbetLsp`:
 - `additionalSorbetLspConfigurationArguments` to `sorbetLspConfigurationAdditionalArguments`.
 - `sorbetCustomLspConfiguration` to `sorbetLspCustomConfiguration`.
- `# typed` -sigil completion provider.

## 0.1.8
- Update snippets.
- Add icon.
- Add `Install` CodeLens to `Gemfile`.
- Change `Verify Workspace` to `Setup Workspace` which follows https://sorbet.org/docs/adopting.

## 0.1.7
- Provide `sorbetto:sorbetStatus` context value.
- `Copy Symbol to Clipboard` UX improvements:
  - Progress UI only shown if operation takes longer than 2s.
  - Disabled whenever Sorbet is in `error` or `disabled` state.
- Internal clean-up.

## 0.1.6
- Update `Ruby` language item entries.
- Remove `Sorbetto: Configure` command.
- Remove `Sorbetto: Show Output` command.
- Fix: Missing `sorbet.savePackageFiles` command used by Sorbet.

## 0.1.5
- Update snippets.

## 0.1.4
- Handle `ENOENT` for a configuration command as a non-recoverable `Error`.

## 0.1.3
- Update settings open when configuring activation verification.
- Update status message when performing an operation.

## 0.1.2
- Provide snippets for several common Sorbet constructs.

## 0.1.1
- Move `Sorbet` status bar item to be part of the `Ruby` language item for more standard behavior.
- Remove unnecessary files fom .vsix.

## 0.1.0
- Verification features:
  - Verify required `srb`, `bundle` during extension startup (can be disabled via config).
  - `Verify Workspace` command allows to setup a workspace with necessary files to get Sorbet running.
- Configuration design is changed from that used by official extension:
  - `Memento`-based setting overrides haare removed, preferring standard VS Code settings behavior.
  - Changing configuration via the `Settings` UI now automatically restarts the Sorbet Language Server when necessary. As a result, all `Toggle` commands are removed to simplify UX.

- Initial version, forked from official 0.3.41.