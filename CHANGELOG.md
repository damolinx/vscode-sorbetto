# Version history

## 0.1.4
- Handle `ENOENT` for a configuration command as a non-recoverable `Error`.

## 0.1.3
- Update settings open when configuring activation verification.
- Update status message when performing an operation.

## 0.1.2
- Provide snippets for several common Sorbet constructs.

## 0.1.1
- Move `Sorbet` status bar item to be part of the `Ruby` language item for more standard behavior. 
- Removed unnecessary files fom .vsix.

## 0.1.0
- Verification features:
  - Verify required `srb`, `bundle` during extension startup (can be disabled via config).
  - `Verify Workspace` command allows to setup a workspace with necessary files to get Sorbet running.
- Configuration design is changed from that used by official extension:
  - `Memento`-based setting overrides haare removed, preferring standard VS Code settings behavior.
  - Changing configuration via the `Settings` UI now automatically restarts the Sorbet Language Server when necessary. As a result, all `Toggle` commands are removed to simplify UX.

- Initial version, forked from official 0.3.41.