# Sorbetto for VS Code
Sorbetto is a Visual Studio Code extension that provides Ruby language support using [Sorbet](https://github.com/sorbet/sorbet), a static type checker for Ruby. It is a fork of the official [extension](https://github.com/sorbet/sorbet/tree/master/vscode_extension), focusing on *user experience* (UX) and *maintainability* improvements.

## Features
- Uses the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem).
- Provides a collection of snippets for Sorbet constructs to make common patterns easier to insert and speed up development.
- Performs automatic dependency checks (e.g., `bundle`, `srb`) and streamlines workspace setup, ensuring a smoother startup experience.

## Maintainability Updates
- Minimum VSCode version updated to 1.77, allowing use of more recent extensibility APIs.
- Language Client library updated to version 9.0.
- Shipped dependencies limited to Language Client library, reducing complexity and risk.
- Migrating to `esbuild` enables minification and bundling, resulting in a significantly smaller runtime code footprint.

# Sorbet Language Status
Sorbetto replaces the custom `Sorbet` status bar item from the official extension with direct integration with VS Code's [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for `Ruby`. This does not result in any loss in functionality, however, as it is possible to pin any entry from the pop-up onto the status bar. So if you preferred the status bar item experience, you still can have it.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/1221a120-7f99-4c06-9630-02685794faf6" alt="Ruby Language Item with Sorbetto entries and statusbar-pinned Status item with Sorbet in Idle state target Stable   configuration" />
</p>

The following entries are available on the language status item:
- `Sorbet Configuration`: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick `Settings` action to modify it.
- `Sorbet Status`: displayes the current status of the Sorbet LSP, including a busy indicator. The `Output` action brings the `Sorbetto` Output pane into view for checking log entries.

# Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs. You can access them via the `Snippet: Fill File with Snippet` command on any open editor, as well as the `Snippet: Insert Snippet` on any `Ruby` editor. Additionally, each snippet has an associated trigger word that is recognized by IntelliSense while typing. For example, typing `abstract` will display the snippets for an abstract class, module or method, allowing for quick and intuitive code insertion. Use the `Snippet: Insert Snippet` from a `Ruby` editor to browse a list of all available snippets in your installed version of the extension.

<p align=center>
  <img width=600 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

# Extension Logs
Sorbetto uses a single output channel to log its exceptions and Sorbet's. The log level can be controlled via the standard `Developer: Set Log Level` commmand, seleting `Sorbetto` from the dropdown. See [VS Code documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.
