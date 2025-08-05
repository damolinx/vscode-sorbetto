# Sorbetto for VS Code
Sorbetto is a Visual Studio Code extension that provides Ruby language support using [Sorbet](https://github.com/sorbet/sorbet), a static type checker for Ruby. It is a fork of the official [extension](https://github.com/sorbet/sorbet/tree/master/vscode_extension), focusing on *user experience* (UX) and *maintainability* improvements.

## Features
- Supports [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby.
- Provides code snippets for common Sorbet constructs to make them easier to use.
- `require_relative` is automatically updated on file move and receives path autocomplete during development.
- `GemFile` receives `gem` autocomplete and custom actions.
- Performs automatic dependency checks (e.g., `bundle`, `srb`) and streamlines workspace setup, ensuring a smoother startup experience.
- `# typed` -sigil completion provider.

## Maintainability Updates
- Minimum VS Code version updated to 1.99, allowing use of more recent extensibility APIs.
- Language Client library updated to version 9.0.
- Shipped dependencies limited to Language Client library, reducing complexity and risk.
- Migrating to `esbuild` enables minification and bundling, resulting in a significantly smaller runtime code footprint.

# Sorbet Language Status Item
Sorbetto replaces the custom **Sorbet** status bar item from the official extension with the standard [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby. This approach enables displaying multiple status entries with accompanying actions in a unified and consistent UI. It is possible to pin specific entries to the status bar for quick access, preserving functionality from the official extension design.

<p align=center>
  <img width="376" height="128" alt="image" src="https://github.com/user-attachments/assets/5ca5466e-bacd-41a6-a5f9-07fdfd7051e5" alt="Ruby Language Item with Sorbetto entries and statusbar-pinned Status item with Sorbet in Idle state target Stable configuration" />
</p>

The following entries are available on the language status item:
- **Sorbet Configuration**: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick **Configure** action to modify it.
- **Sorbet Status**: displays the current status of the Sorbet LSP, including a busy indicator. The **Output** action brings the **Sorbetto** Output pane into view for checking log entries.

# Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs. You can access them via the **Snippet: Fill File with Snippet** command on any open editor, as well as the **Snippet: Insert Snippet** on any `ruby`-language editor. Additionally, each snippet has an associated trigger word that is recognized by IntelliSense while typing. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion. Use the **Snippet: Insert Snippet** from a `ruby` editor to browse a list of all available snippets in your installed version of the extension.

<p align=center>
  <img width=600 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

# Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) into a convenient place. When setting up `bundler`, it will force local installation of gems via `bundle config set --local path 'vendor/bundle'`. Don't use this command if you prefer globally installed gems, and follow the linked documentation to set up your workspace.

# Extension Logs
Sorbetto uses a single output channel to log its exceptions and Sorbet's. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.
